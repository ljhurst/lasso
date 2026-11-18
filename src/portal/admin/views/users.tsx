import { accountStatus, STATUS_LABEL } from '#src/users/status.ts';
import type { User } from '#src/users/types.ts';
import { Empty, Layout, List, Table } from '#src/portal/views/layout.tsx';

export function UsersListPage(props: { users: User[] }) {
  return (
    <Layout title="Users" active="/admin/users" isAdmin={true}>
      <section>
        <div class="heading-row">
          <h2>Users ({props.users.length})</h2>
          <a class="row-action primary" href="/admin/users/new">
            Add user
          </a>
        </div>
        {props.users.length === 0 ? (
          <Empty>No users yet.</Empty>
        ) : (
          <Table
            columns={['Name', 'Email', 'Roles', 'Status', '']}
            rows={props.users.map((user) => [
              <span safe>
                {user.givenName} {user.familyName}
              </span>,
              <code safe>{user.email}</code>,
              <List items={user.roles} mono />,
              <span safe>{STATUS_LABEL[accountStatus(user)]}</span>,
              <a class="row-action" href={`/admin/users/${user.sub}`}>
                View
              </a>,
            ])}
          />
        )}
      </section>
    </Layout>
  );
}
