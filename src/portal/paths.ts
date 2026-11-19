export const ADMIN_PREFIX = '/admin';
export const APPS_URL = '/apps';

/** The admin router's route patterns, relative to ADMIN_PREFIX. */
export const ROUTE = {
  dashboard: '/',
  users: '/users',
  newUser: '/users/new',
  user: '/users/:sub',
  addRole: '/users/:sub/roles',
  removeRole: '/users/:sub/roles/remove',
  deleteUser: '/users/:sub/delete',
  resetPassword: '/users/:sub/reset-password',
  newClient: '/clients/new',
  clients: '/clients',
  client: '/clients/:clientId',
  deleteClient: '/clients/:clientId/delete',
  addClientScope: '/clients/:clientId/scopes',
  removeClientScope: '/clients/:clientId/scopes/remove',
} as const;

/** Links and redirects to the admin routes, built from the same patterns the router uses. */
export const adminUrl = {
  dashboard: () => build(ROUTE.dashboard),
  users: () => build(ROUTE.users),
  newUser: () => build(ROUTE.newUser),
  user: (sub: string) => build(ROUTE.user, sub),
  addRole: (sub: string) => build(ROUTE.addRole, sub),
  removeRole: (sub: string) => build(ROUTE.removeRole, sub),
  deleteUser: (sub: string) => build(ROUTE.deleteUser, sub),
  resetPassword: (sub: string) => build(ROUTE.resetPassword, sub),
  newClient: () => build(ROUTE.newClient),
  clients: () => build(ROUTE.clients),
  client: (clientId: string) => build(ROUTE.client, clientId),
  deleteClient: (clientId: string) => build(ROUTE.deleteClient, clientId),
  addClientScope: (clientId: string) => build(ROUTE.addClientScope, clientId),
  removeClientScope: (clientId: string) => build(ROUTE.removeClientScope, clientId),
};

function build(pattern: string, param = ''): string {
  const path = pattern === '/' ? ADMIN_PREFIX : `${ADMIN_PREFIX}${pattern}`;
  return path.replace(/:\w+/, encodeURIComponent(param));
}
