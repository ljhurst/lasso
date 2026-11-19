import type { RegisteredResource, ResourceApp } from '#src/resources/types.ts';

export const MAX_RESOURCE_NAME_LENGTH = 100;
export const MAX_SCOPES = 20;
const SCOPE_SHAPE = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * The first problem with a resource, or undefined when it is safe to store.
 * `reservedScopes` are scopes Lasso owns (its own admin scope), and
 * `reservedResources` are indicators it owns (its own API).
 */
export function validateResource(
  resource: RegisteredResource,
  app: ResourceApp | undefined,
  reserved: { scopes: readonly string[]; resources: readonly string[] },
): string | undefined {
  return (
    validateIndicator(resource.resource, reserved.resources) ??
    validateName(resource.resource_name) ??
    validateScopes(resource.scopes_supported, reserved.scopes) ??
    validateApp(app)
  );
}

function validateIndicator(indicator: string, reserved: readonly string[]): string | undefined {
  const url = URL.parse(indicator);
  const isSecure =
    url?.protocol === 'https:' || (url?.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname));
  if (!url || !isSecure || url.hash !== '' || url.username !== '' || url.password !== '') {
    return 'The resource must be an https URL, or http on localhost, with no fragment.';
  }
  if (reserved.includes(indicator)) {
    return 'That resource belongs to Lasso itself.';
  }
  return undefined;
}

function validateName(name: string): string | undefined {
  if (name.length === 0 || name.length > MAX_RESOURCE_NAME_LENGTH) {
    return `Name must be 1-${MAX_RESOURCE_NAME_LENGTH} characters.`;
  }
  return undefined;
}

function validateScopes(scopes: string[], reserved: readonly string[]): string | undefined {
  if (scopes.length === 0 || scopes.length > MAX_SCOPES) {
    return `Give 1-${MAX_SCOPES} scopes.`;
  }
  const bad = scopes.find((scope) => !SCOPE_SHAPE.test(scope));
  if (bad) {
    return `Scope "${bad}" must look like project:action, in lowercase letters, digits and hyphens.`;
  }
  if (new Set(scopes).size !== scopes.length) {
    return 'List each scope once.';
  }
  const owned = scopes.find((scope) => reserved.includes(scope));
  return owned && `Scope "${owned}" belongs to Lasso itself.`;
}

function validateApp(app: ResourceApp | undefined): string | undefined {
  if (!app?.url) {
    return undefined;
  }
  const url = URL.parse(app.url);
  const isSecure =
    url?.protocol === 'https:' || (url?.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname));
  return isSecure && url?.hash === ''
    ? undefined
    : 'The app link must be an https URL, or http on localhost.';
}
