import type { AccessTokenRow, GrantRow, SessionRow } from '../data.ts';
import { Empty, Layout, List, Table } from './layout.tsx';

function formatExpiry(expiresAt: number | undefined): string {
  return expiresAt ? new Date(expiresAt * 1000).toISOString() : '—';
}

export function UsersPage(props: {
  username: string;
  sessions: SessionRow[];
  grants: GrantRow[];
  accessTokens: AccessTokenRow[];
}) {
  return (
    <Layout title="Users" active="/admin/users">
      <section>
        <h2>Account</h2>
        <Table columns={['Username']}>
          <tr>
            <td>
              <code>{props.username}</code>
            </td>
          </tr>
        </Table>
      </section>
      <section>
        <h2>Active sessions ({props.sessions.length})</h2>
        {props.sessions.length === 0 ? (
          <Empty>No active sessions.</Empty>
        ) : (
          <Table columns={['Account', 'Session ID', 'Expires']}>
            {props.sessions.map((session) => (
              <tr>
                <td>{session.accountId}</td>
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
          <Table columns={['Account', 'Client', 'Grant ID', 'Expires']}>
            {props.grants.map((grant) => (
              <tr>
                <td>{grant.accountId}</td>
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
          <Table columns={['Account', 'Client', 'Scope', 'Expires']}>
            {props.accessTokens.map((token) => (
              <tr>
                <td>{token.accountId}</td>
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
