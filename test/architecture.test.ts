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
  users: ['adapter', 'config', 'interactions', 'portal'],
  adapter: ['config', 'interactions', 'portal'],
  interactions: ['portal'],
  portal: ['interactions'],
};

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

describe('source layering', () => {
  it('has no import that points the wrong way', () => {
    expect(findViolations(readSource())).toEqual([]);
  });
});
