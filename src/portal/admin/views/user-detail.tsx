import type { User } from '#src/users/types.ts';
import type { AccessTokenRow, GrantRow, SessionRow } from '#src/portal/admin/data.ts';
import { Empty, Layout, List, Table } from '#src/portal/views/layout.tsx';

function formatExpiry(expiresAt: number | undefined): string {
  return expiresAt ? new Date(expiresAt * 1000).toISOString() : '—';
}

export function UserDetailPage(props: {
  user: User;
  sessions: SessionRow[];
  grants: GrantRow[];
  accessTokens: AccessTokenRow[];
  grantableRoles: string[];
}) {
  return (
    <Layout title={props.user.email} active="/admin/users" isAdmin={true}>
      <section>
        <h2>
          {props.user.givenName} {props.user.familyName}
        </h2>
        <Table columns={['Email', 'Roles']}>
          <tr>
            <td>
              <code>{props.user.email}</code>
            </td>
            <td>
              <List items={props.user.roles} mono />
            </td>
          </tr>
        </Table>
      </section>
      <section>
        <h2>Grant a role</h2>
        {props.grantableRoles.length === 0 ? (
          <Empty>This user already has every registered role.</Empty>
        ) : (
          <form method="post" action={`/admin/users/${props.user.sub}/roles`}>
            <select name="role">
              {props.grantableRoles.map((role) => (
                <option value={role}>{role}</option>
              ))}
            </select>
            <button type="submit">Grant</button>
          </form>
        )}
      </section>
      <section>
        <h2>Active sessions ({props.sessions.length})</h2>
        {props.sessions.length === 0 ? (
          <Empty>No active sessions.</Empty>
        ) : (
          <Table columns={['Session ID', 'Expires']}>
            {props.sessions.map((session) => (
              <tr>
                <td>
                  <code>{session.id}</code>
                </td>
                <td>{formatExpiry(session.expiresAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      <section>
        <h2>Active grants ({props.grants.length})</h2>
        {props.grants.length === 0 ? (
          <Empty>No active grants.</Empty>
        ) : (
          <Table columns={['Client', 'Grant ID', 'Expires']}>
            {props.grants.map((grant) => (
              <tr>
                <td>{grant.clientId}</td>
                <td>
                  <code>{grant.id}</code>
                </td>
                <td>{formatExpiry(grant.expiresAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
      <section>
        <h2>Active access tokens ({props.accessTokens.length})</h2>
        {props.accessTokens.length === 0 ? (
          <Empty>No active access tokens.</Empty>
        ) : (
          <Table columns={['Client', 'Scope', 'Expires']}>
            {props.accessTokens.map((token) => (
              <tr>
                <td>{token.clientId}</td>
                <td>
                  <List items={token.scope?.split(' ') ?? []} mono />
                </td>
                <td>{formatExpiry(token.expiresAt)}</td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </Layout>
  );
}
