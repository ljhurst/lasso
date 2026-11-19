import { describe, expect, it } from 'vitest';
import {
  type NewResourceInput,
  registerResource,
  removeResource,
  updateResource,
} from '#src/resources/register.ts';
import { fakeResourceServices } from '#test/support/resource-services.ts';
import { makeResource } from '#test/support/resources.ts';

const input: NewResourceInput = {
  resource: 'https://api.example.com/',
  name: 'Example API',
  scopes: ['example:read', 'example:write'],
  appType: 'mcp',
  appUrl: 'https://api.example.com/mcp',
};

describe('registerResource', () => {
  it('stores the resource as protected resource metadata with its app link', async () => {
    const services = fakeResourceServices();

    await registerResource(services, input, new Date('2026-02-03T04:05:06Z'));

    expect(services.rows.get('https://api.example.com/')).toEqual({
      resource: 'https://api.example.com/',
      createdAt: '2026-02-03T04:05:06.000Z',
      metadata: {
        resource_name: 'Example API',
        scopes_supported: ['example:read', 'example:write'],
      },
      app: { type: 'mcp', url: 'https://api.example.com/mcp' },
    });
  });

  it('stores the indicator once, as the key, and not again inside the metadata', async () => {
    const services = fakeResourceServices();

    await registerResource(services, input);

    expect(services.rows.get('https://api.example.com/')?.metadata).not.toHaveProperty('resource');
  });

  it('stores no app link when none is chosen', async () => {
    const services = fakeResourceServices();

    await registerResource(services, { ...input, appType: undefined, appUrl: '' });

    expect(services.rows.get('https://api.example.com/')).not.toHaveProperty('app');
  });

  it('reports a problem and writes nothing', async () => {
    const services = fakeResourceServices();

    const result = await registerResource(services, { ...input, scopes: ['lasso:admin'] });

    expect(result).toEqual({ error: expect.stringContaining('belongs to Lasso') });
    expect(services.rows.size).toBe(0);
  });

  it("refuses Lasso's own resource", async () => {
    const services = fakeResourceServices();

    const result = await registerResource(services, {
      ...input,
      resource: 'https://lasso.example.com',
    });

    expect(result).toEqual({ error: expect.stringContaining('belongs to Lasso') });
  });

  it('refuses an indicator that is taken', async () => {
    const services = fakeResourceServices([makeResource()]);

    expect(await registerResource(services, input)).toEqual({
      error: 'A resource with that indicator already exists.',
    });
  });
});

describe('updateResource', () => {
  const edits = {
    name: 'Renamed',
    scopes: ['example:read', 'example:admin'],
    appType: 'web' as const,
    appUrl: 'https://app.example.com/',
  };

  it('changes name, scopes and app link but never the indicator or creation time', async () => {
    const services = fakeResourceServices([makeResource()]);

    await updateResource(services, 'https://api.example.com/', edits);

    expect(services.rows.get('https://api.example.com/')).toEqual({
      resource: 'https://api.example.com/',
      createdAt: '2026-01-01T00:00:00.000Z',
      metadata: {
        resource_name: 'Renamed',
        scopes_supported: ['example:read', 'example:admin'],
      },
      app: { type: 'web', url: 'https://app.example.com/' },
    });
  });

  it('keeps an existing logo and drops the app link when cleared', async () => {
    const withLogo = makeResource(
      {},
      { type: 'web', url: 'https://a.example.com/', logo: 'https://a.example.com/l.png' },
    );
    const services = fakeResourceServices([withLogo]);

    await updateResource(services, 'https://api.example.com/', edits);
    expect(services.rows.get('https://api.example.com/')?.app?.logo).toBe(
      'https://a.example.com/l.png',
    );

    await updateResource(services, 'https://api.example.com/', { ...edits, appType: undefined });
    expect(services.rows.get('https://api.example.com/')).not.toHaveProperty('app');
  });

  it('keeps the stored resource when an edit is invalid', async () => {
    const services = fakeResourceServices([makeResource()]);

    const result = await updateResource(services, 'https://api.example.com/', {
      ...edits,
      scopes: [],
    });

    expect(result).toEqual({ error: expect.stringContaining('scopes') });
    expect(services.rows.get('https://api.example.com/')?.metadata.resource_name).toBe(
      'Example API',
    );
  });

  it('says so when the resource is gone', async () => {
    expect(
      await updateResource(fakeResourceServices(), 'https://nope.example.com/', edits),
    ).toEqual({
      error: 'That resource no longer exists.',
    });
  });

  it('refuses to drop a scope a client holds', async () => {
    const services = fakeResourceServices([makeResource()]);
    services.held.add('example:write');

    const result = await updateResource(services, 'https://api.example.com/', edits);

    expect(result).toEqual({ error: expect.stringContaining('example:write') });
    expect(services.rows.get('https://api.example.com/')?.metadata.scopes_supported).toEqual([
      'example:read',
      'example:write',
    ]);
  });

  it('lets a held scope go when another resource still offers it', async () => {
    const services = fakeResourceServices([
      makeResource(),
      makeResource({ resource: 'https://other.example.com/', scopes_supported: ['example:write'] }),
    ]);
    services.held.add('example:write');

    const result = await updateResource(services, 'https://api.example.com/', edits);

    expect('record' in result).toBe(true);
  });
});

describe('removeResource', () => {
  it('deletes the resource', async () => {
    const services = fakeResourceServices([makeResource()]);

    const result = await removeResource(services, 'https://api.example.com/');

    expect(result).toMatchObject({ record: { resource: 'https://api.example.com/' } });
    expect(services.rows.size).toBe(0);
  });

  it('refuses while a client holds a scope only this resource offers', async () => {
    const services = fakeResourceServices([makeResource()]);
    services.held.add('example:read');

    const result = await removeResource(services, 'https://api.example.com/');

    expect(result).toEqual({ error: expect.stringContaining('example:read') });
    expect(services.rows.size).toBe(1);
  });

  it('allows it when the held scope is also offered elsewhere', async () => {
    const services = fakeResourceServices([
      makeResource(),
      makeResource({ resource: 'https://other.example.com/', scopes_supported: ['example:read'] }),
    ]);
    services.held.add('example:read');

    await removeResource(services, 'https://api.example.com/');

    expect([...services.rows.keys()]).toEqual(['https://other.example.com/']);
  });

  it('says so when the resource is gone', async () => {
    expect(await removeResource(fakeResourceServices(), 'https://nope.example.com/')).toEqual({
      error: 'That resource no longer exists.',
    });
  });
});
