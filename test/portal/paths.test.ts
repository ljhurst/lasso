import { describe, expect, it } from 'vitest';
import { ADMIN_PREFIX, adminUrl, APPS_URL, ROUTE } from '#src/portal/paths.ts';

const SUB = 'b3698a6c-188e-4a4f-8c79-a8e09843fc34';

describe('adminUrl', () => {
  it.each([
    ['dashboard', adminUrl.dashboard(), '/admin'],
    ['users', adminUrl.users(), '/admin/users'],
    ['newUser', adminUrl.newUser(), '/admin/users/new'],
    ['user', adminUrl.user(SUB), `/admin/users/${SUB}`],
    ['addRole', adminUrl.addRole(SUB), `/admin/users/${SUB}/roles`],
    ['removeRole', adminUrl.removeRole(SUB), `/admin/users/${SUB}/roles/remove`],
    ['deleteUser', adminUrl.deleteUser(SUB), `/admin/users/${SUB}/delete`],
    ['resetPassword', adminUrl.resetPassword(SUB), `/admin/users/${SUB}/reset-password`],
    ['newClient', adminUrl.newClient(), '/admin/clients/new'],
    ['clients', adminUrl.clients(), '/admin/clients'],
    ['client', adminUrl.client('my-app'), '/admin/clients/my-app'],
    ['deleteClient', adminUrl.deleteClient('my-app'), '/admin/clients/my-app/delete'],
  ])('builds the %s address', (_name, url, expected) => {
    expect(url).toBe(expected);
  });

  it('is the router prefix plus the route pattern, for every route', () => {
    const forSub = (pattern: string) => `${ADMIN_PREFIX}${pattern.replace(':sub', 'x')}`;

    expect(adminUrl.dashboard()).toBe(ADMIN_PREFIX);
    expect(adminUrl.users()).toBe(`${ADMIN_PREFIX}${ROUTE.users}`);
    expect(adminUrl.newUser()).toBe(`${ADMIN_PREFIX}${ROUTE.newUser}`);
    expect(adminUrl.user('x')).toBe(forSub(ROUTE.user));
    expect(adminUrl.addRole('x')).toBe(forSub(ROUTE.addRole));
    expect(adminUrl.removeRole('x')).toBe(forSub(ROUTE.removeRole));
    expect(adminUrl.deleteUser('x')).toBe(forSub(ROUTE.deleteUser));
    expect(adminUrl.resetPassword('x')).toBe(forSub(ROUTE.resetPassword));
    expect(adminUrl.newClient()).toBe(`${ADMIN_PREFIX}${ROUTE.newClient}`);
    expect(adminUrl.clients()).toBe(`${ADMIN_PREFIX}${ROUTE.clients}`);
    expect(adminUrl.client('x')).toBe(`${ADMIN_PREFIX}${ROUTE.client.replace(':clientId', 'x')}`);
    expect(adminUrl.deleteClient('x')).toBe(
      `${ADMIN_PREFIX}${ROUTE.deleteClient.replace(':clientId', 'x')}`,
    );
  });

  it('encodes a client id so it cannot add path segments', () => {
    expect(adminUrl.client('a/../b')).toBe('/admin/clients/a%2F..%2Fb');
  });

  it('encodes a sub so it cannot add path segments', () => {
    expect(adminUrl.user('a/../b')).toBe('/admin/users/a%2F..%2Fb');
  });
});

describe('APPS_URL', () => {
  it('is the apps address', () => {
    expect(APPS_URL).toBe('/apps');
  });
});
