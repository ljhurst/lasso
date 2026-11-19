import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** For each source directory, the directories it must not import from. */
const FORBIDDEN: Record<string, string[]> = {
  aws: [
    'adapter',
    'auth',
    'clients',
    'config',
    'interactions',
    'observability',
    'portal',
    'users',
    'views',
  ],
  views: ['adapter', 'clients', 'config', 'interactions', 'observability', 'portal', 'users'],
  clients: ['adapter', 'config', 'interactions', 'portal'],
  resources: ['adapter', 'config', 'interactions', 'portal'],
  users: ['adapter', 'config', 'interactions', 'portal'],
  adapter: ['config', 'interactions', 'portal'],
  interactions: ['portal'],
  portal: ['interactions'],
};

/** Parts of the admin portal that must stay independent of each other. */
const PATH_RULES = [
  { within: 'src/portal/admin/clients/', mustNotImport: '#src/portal/admin/users/' },
  { within: 'src/portal/admin/users/', mustNotImport: '#src/portal/admin/clients/' },
  { within: 'src/portal/admin/views/components/', mustNotImport: '#src/portal/admin/users/' },
  { within: 'src/portal/admin/views/components/', mustNotImport: '#src/portal/admin/clients/' },
];

const IMPORT = /from '#src\/([a-z]+)\//g;

interface SourceFile {
  path: string;
  text: string;
}

function findViolations(files: SourceFile[]): string[] {
  const violations: string[] = [];
  for (const { path, text } of files) {
    const own = path.split('/')[1];
    const forbidden = FORBIDDEN[own ?? ''] ?? [];
    for (const [, imported] of text.matchAll(IMPORT)) {
      if (imported && forbidden.includes(imported)) {
        violations.push(`${path} imports ${imported}`);
      }
    }
    for (const rule of PATH_RULES) {
      if (path.startsWith(rule.within) && text.includes(`from '${rule.mustNotImport}`)) {
        violations.push(`${path} imports ${rule.mustNotImport}`);
      }
    }
  }
  return violations;
}

function readSource(): SourceFile[] {
  return readdirSync('src', { recursive: true, encoding: 'utf8' })
    .filter((path) => /\.tsx?$/.test(path) && !path.endsWith('.d.ts'))
    .map((path) => ({ path: join('src', path), text: readFileSync(join('src', path), 'utf8') }));
}

describe('findViolations', () => {
  it('flags an import of a directory the importer must not depend on', () => {
    const files = [
      { path: 'src/clients/x.ts', text: "import { a } from '#src/adapter/client.ts';" },
    ];

    expect(findViolations(files)).toEqual(['src/clients/x.ts imports adapter']);
  });

  it('allows imports in the permitted direction and of shared root files', () => {
    const files = [
      {
        path: 'src/adapter/x.ts',
        text: "import { a } from '#src/clients/types.ts';\nimport { e } from '#src/env.ts';",
      },
    ];

    expect(findViolations(files)).toEqual([]);
  });
});

describe('findViolations on the admin portal', () => {
  it('flags the users area reaching into clients, and shared components into either', () => {
    const files = [
      {
        path: 'src/portal/admin/users/routes.ts',
        text: "import { a } from '#src/portal/admin/clients/policy.ts';",
      },
      {
        path: 'src/portal/admin/views/components/x.tsx',
        text: "import { a } from '#src/portal/admin/users/roles.ts';",
      },
    ];

    expect(findViolations(files)).toEqual([
      'src/portal/admin/users/routes.ts imports #src/portal/admin/clients/',
      'src/portal/admin/views/components/x.tsx imports #src/portal/admin/users/',
    ]);
  });

  it('allows an area to use the shared admin parts', () => {
    const files = [
      {
        path: 'src/portal/admin/users/routes.ts',
        text: "import { a } from '#src/portal/admin/revocation.ts';\nimport { b } from '#src/portal/admin/views/components/confirm-page.tsx';",
      },
    ];

    expect(findViolations(files)).toEqual([]);
  });
});

describe('source layering', () => {
  it('has no import that points the wrong way', () => {
    expect(findViolations(readSource())).toEqual([]);
  });
});
