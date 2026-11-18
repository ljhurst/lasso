import type { User } from '#src/users/types.ts';
import type { AccessTokenRow, GrantRow, SessionRow } from '#src/portal/admin/data.ts';
import { Empty, Facts, Help, Layout, List, Table, Time } from '#src/portal/views/layout.tsx';

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
        <h2 safe>
          {props.user.givenName} {props.user.familyName}
        </h2>
        <Facts
          items={[
            { label: 'Email', value: <code safe>{props.user.email}</code> },
            {
              label: 'User ID (sub)',
              value: (
                <code class="sub" safe>
                  {props.user.sub}
                </code>
              ),
            },
            { label: 'Roles', value: <List items={props.user.roles} mono /> },
          ]}
        />
      </section>
      <section>
        <h2>Grant a role</h2>
        {props.grantableRoles.length === 0 ? (
          <Empty>This user already has every registered role.</Empty>
        ) : (
          <form method="post" action={`/admin/users/${props.user.sub}/roles`}>
            <select name="role">
              {props.grantableRoles.toSorted().map((role) => (
                <option value={role} safe>
                  {role}
                </option>
              ))}
            </select>
            <button type="submit">Grant</button>
          </form>
        )}
      </section>
      <section>
        <h2>Remove a role</h2>
        {props.user.roles.length === 0 ? (
          <Empty>No roles to remove.</Empty>
        ) : (
          <form method="post" action={`/admin/users/${props.user.sub}/roles/remove`}>
            <select name="role">
              {props.user.roles.toSorted().map((role) => (
                <option value={role} safe>
                  {role}
                </option>
              ))}
            </select>
            <button type="submit">Remove</button>
          </form>
        )}
      </section>
      <section>
        <h2>
          Active sessions ({props.sessions.length})
          <Help text={SESSION_HELP} />
        </h2>
        {props.sessions.length === 0 ? (
          <Empty>No active sessions.</Empty>
        ) : (
          <Table
            columns={['Apps', 'Signed in', 'Expires', 'Session ID']}
            rows={props.sessions.map((session) => [
              session.clientIds.length === 0 ? (
                <span class="empty-cell">—</span>
              ) : (
                <ul class="stacked">
                  {session.clientIds.map((clientId) => (
                    <li>
                      <ClientLabel clientId={clientId} />
                    </li>
                  ))}
                </ul>
              ),
              <Time seconds={session.loginTs} />,
              <Time seconds={session.expiresAt} />,
              <code safe>{session.id}</code>,
            ])}
          />
        )}
      </section>
      <section>
        <h2>
          Active grants ({props.grants.length})
          <Help text={GRANT_HELP} />
        </h2>
        {props.grants.length === 0 ? (
          <Empty>No active grants.</Empty>
        ) : (
          <Table
            columns={['Client', 'Expires', 'Grant ID']}
            rows={props.grants.map((grant) => [
              <ClientLabel clientId={grant.clientId} />,
              <Time seconds={grant.expiresAt} />,
              <code safe>{grant.id}</code>,
            ])}
          />
        )}
      </section>
      <section>
        <h2>
          Active access tokens ({props.accessTokens.length})
          <Help text={ACCESS_TOKEN_HELP} />
        </h2>
        {props.accessTokens.length === 0 ? (
          <Empty>No active access tokens.</Empty>
        ) : (
          <Table
            columns={['Client', 'Scope', 'Expires']}
            rows={props.accessTokens.map((token) => [
              <ClientLabel clientId={token.clientId} />,
              <List items={token.scope?.split(' ') ?? []} mono />,
              <Time seconds={token.expiresAt} />,
            ])}
          />
        )}
      </section>
    </Layout>
  );
}

const SESSION_HELP =
  'A browser sign-in to Lasso. While it lasts, apps can sign this person in again without asking for the password. It ends when it expires or at logout.';
const GRANT_HELP =
  'What this person agreed to let an app access. An app exchanges a grant for access tokens. Removing a role ends the grants that carried it.';
const ACCESS_TOKEN_HELP =
  'Short-lived credentials an app presents to an API, each tied to one grant and limited to its scopes.';

function ClientLabel(props: { clientId: string | undefined }) {
  return props.clientId ? <code safe>{props.clientId}</code> : <span class="empty-cell">—</span>;
}
