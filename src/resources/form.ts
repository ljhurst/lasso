import type { NewResourceInput, ResourceEdits } from '#src/resources/register.ts';
import { AppType } from '#src/resources/types.ts';

const APP_TYPES: readonly string[] = Object.values(AppType);

export function parseNewResource(form: URLSearchParams): NewResourceInput {
  return { resource: (form.get('resource') ?? '').trim(), ...parseResourceEdits(form) };
}

/** Scopes may be separated by spaces, commas or new lines. */
export function parseResourceEdits(form: URLSearchParams): ResourceEdits {
  const type = form.get('appType') ?? '';
  const scopes = (form.get('scopes') ?? '').split(/[\s,]+/).filter((scope) => scope.length > 0);
  return {
    name: (form.get('name') ?? '').trim(),
    scopes: [...new Set(scopes)],
    appType: APP_TYPES.includes(type) ? (type as AppType) : undefined,
    appUrl: (form.get('appUrl') ?? '').trim(),
  };
}
