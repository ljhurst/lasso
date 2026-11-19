import { emailFact } from '#src/portal/admin/views/components/person-facts.tsx';
import { accountStatus, STATUS_LABEL } from '#src/users/status.ts';
import type { User } from '#src/users/types.ts';
import type { AccessTokenRow, GrantRow, SessionRow } from '#src/adapter/records.ts';
import { RemovableItem } from '#src/portal/admin/views/components/removable-item.tsx';
import type { HeldRole } from '#src/portal/admin/types.ts';
import { Empty } from '#src/portal/views/components/empty.tsx';
import { Facts } from '#src/portal/views/components/facts.tsx';
import { Help } from '#src/portal/views/components/help.tsx';
import { List } from '#src/portal/views/components/list.tsx';
import { Table } from '#src/portal/views/components/table.tsx';
import { Time } from '#src/portal/views/components/time.tsx';
import { Layout } from '#src/portal/views/layout.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { fullName } from '#src/users/name.ts';

export function UserDetailPage(props: {
  user: User;
  sessions: SessionRow[];
  grants: GrantRow[];
  accessTokens: AccessTokenRow[];
  roles: HeldRole[];
  grantableRoles: string[];
  canManage: boolean;
}) {
  return (
    <Layout
      title={props.user.email}
      active={adminUrl.users()}
      isAdmin={true}
      crumbs={[{ label: 'Users', href: adminUrl.users() }]}
    >
      <section>
        <h2 safe>{fullName(props.user)}</h2>
        <Facts
          items={[
            emailFact(props.user),
            {
              label: 'User ID (sub)',
              value: (
                <code class="sub" safe>
                  {props.user.sub}
                </code>
              ),
            },
            { label: 'Status', value: <span safe>{STATUS_LABEL[accountStatus(props.user)]}</span> },
            { label: 'Created', value: <Time seconds={createdAtSeconds(props.user)} /> },
            ...passwordExpiryFacts(props.user),
          ]}
        />
      </section>
      <section>
        <h2>Roles ({props.roles.length})</h2>
        {props.roles.length === 0 ? (
          <Empty>No roles yet.</Empty>
        ) : (
          <ul class="roles">
            {props.roles.map((held) => (
              <RoleRow held={held} sub={props.user.sub} />
            ))}
          </ul>
        )}
        {props.grantableRoles.length === 0 ? (
          <Empty>This user already has every registered role.</Empty>
        ) : (
          <form class="add-role" method="post" action={adminUrl.addRole(props.user.sub)}>
            <select name="role" required aria-label="Role to add" class="control">
              <option value="">Choose a role…</option>
              {props.grantableRoles.toSorted().map((role) => (
                <option value={role} safe>
                  {role}
                </option>
              ))}
            </select>
            <button type="submit" class="primary">
              Add
            </button>
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
      {props.canManage ? (
        <section>
          <h2>Reset password</h2>
          <p class="empty">
            Replaces their password with a temporary one and signs them out everywhere.
          </p>
          <a class="row-action caution" href={adminUrl.resetPassword(props.user.sub)}>
            Reset password
          </a>
        </section>
      ) : null}
      {props.canManage ? (
        <section>
          <h2>Delete user</h2>
          <p class="empty">Removes the account and signs them out everywhere.</p>
          <a class="row-action danger" href={adminUrl.deleteUser(props.user.sub)}>
            Delete user
          </a>
        </section>
      ) : null}
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

function RoleRow(props: { held: HeldRole; sub: string }) {
  const { held, sub } = props;
  return (
    <RemovableItem
      label={held.role}
      notes={[
        ...(held.registered ? [] : ['no longer registered']),
        ...(held.blockedReason ? [held.blockedReason] : []),
      ]}
      action={adminUrl.removeRole(sub)}
      field="role"
      blocked={Boolean(held.blockedReason)}
    />
  );
}

function createdAtSeconds(user: User): number | undefined {
  const created = Date.parse(user.createdAt);
  return Number.isNaN(created) ? undefined : Math.floor(created / 1000);
}

function passwordExpiryFacts(user: User): { label: string; value: JSX.Element }[] {
  if (!user.mustChangePassword || user.tempPasswordExpiresAt === undefined) {
    return [];
  }
  return [{ label: 'Password expires', value: <Time seconds={user.tempPasswordExpiresAt} /> }];
}
