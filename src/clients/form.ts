import type { ApplicationType } from '#src/clients/types.ts';
import type { ClientEdits, ClientKind, NewClientInput } from '#src/clients/register.ts';

/** Reads the new-client form. Anything unrecognised falls back to the safer option and is then validated. */
export function parseNewClient(form: URLSearchParams): NewClientInput {
  const kind: ClientKind = form.get('kind') === 'service' ? 'service' : 'app';
  const applicationType: ApplicationType =
    form.get('applicationType') === 'native' ? 'native' : 'web';
  return {
    clientId: (form.get('clientId') ?? '').trim(),
    kind,
    applicationType,
    ...parseClientEdits(form),
  };
}

/** Reads the fields an existing client lets you change. */
export function parseClientEdits(form: URLSearchParams): ClientEdits {
  return {
    name: (form.get('name') ?? '').trim(),
    redirectUris: lines(form.get('redirectUris')),
    postLogoutRedirectUris: lines(form.get('postLogoutRedirectUris')),
    scopes: [...new Set(form.getAll('scope'))],
  };
}

function lines(value: string | null): string[] {
  const entries = (value ?? '').split(/\r?\n/).map((line) => line.trim());
  return [...new Set(entries.filter((line) => line.length > 0))];
}
