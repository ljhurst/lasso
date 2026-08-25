import type { User } from '../../users/types.ts';
import type { AccessTokenRow, GrantRow, SessionRow } from '../data.ts';
import { Empty, Layout, List, Table } from './layout.tsx';

function formatExpiry(expiresAt: number | undefined): string {
  return expiresAt ? new Date(expiresAt * 1000).toISOString() : '—';
}

function accountLabel(
  accountId: string | undefined,
  accountEmails: Record<string, string>,
): string {
  if (!accountId) {
    return '—';
  }
  return accountEmails[accountId] ?? accountId;
}

export function UsersPage(props: {
  admin: User;
  sessions: SessionRow[];
  grants: GrantRow[];
  accessTokens: AccessTokenRow[];
  accountEmails: Record<string, string>;
}) {
  return (
    <Layout title="Users" active="/admin/users">
      <section>
        <h2>Signed in as</h2>
        <Table columns={['Name', 'Email']}>
          <tr>
            <td>
              {props.admin.givenName} {props.admin.familyName}
            </td>
            <td>
              <code>{props.admin.email}</code>
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
                <td>{accountLabel(session.accountId, props.accountEmails)}</td>
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
                <td>{accountLabel(grant.accountId, props.accountEmails)}</td>
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
                <td>{accountLabel(token.accountId, props.accountEmails)}</td>
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
