import { accountStatus, STATUS_LABEL } from '#src/users/status.ts';
import type { User } from '#src/users/types.ts';
import { Empty } from '#src/portal/views/components/empty.tsx';
import { List } from '#src/portal/views/components/list.tsx';
import { Table } from '#src/portal/views/components/table.tsx';
import { AdminLayout } from '#src/portal/admin/views/components/admin-layout.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { fullName } from '#src/users/name.ts';

export function UsersListPage(props: { users: User[] }) {
  return (
    <AdminLayout section="users" title="Users" index>
      <section>
        <div class="heading-row">
          <h2>Users ({props.users.length})</h2>
          <a class="row-action primary" href={adminUrl.newUser()}>
            Add user
          </a>
        </div>
        {props.users.length === 0 ? (
          <Empty>No users yet.</Empty>
        ) : (
          <Table
            columns={['Name', 'Email', 'Roles', 'Status']}
            rows={props.users.toSorted(byFirstName).map((user) => [
              <a class="name-link" href={adminUrl.user(user.sub)} safe>
                {fullName(user)}
              </a>,
              <code safe>{user.email}</code>,
              <List items={user.roles} mono />,
              <span safe>{STATUS_LABEL[accountStatus(user)]}</span>,
            ])}
          />
        )}
      </section>
    </AdminLayout>
  );
}

function byFirstName(a: User, b: User): number {
  return (
    compareText(a.givenName, b.givenName) ||
    compareText(a.familyName, b.familyName) ||
    compareText(a.email, b.email)
  );
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, 'en', { sensitivity: 'base' });
}
