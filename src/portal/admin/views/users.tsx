import type { User } from '#src/users/types.ts';
import { Empty, Layout, List, Table } from '#src/portal/views/layout.tsx';

export function UsersListPage(props: { users: User[] }) {
  return (
    <Layout title="Users" active="/admin/users" isAdmin={true}>
      <section>
        <h2>Users ({props.users.length})</h2>
        {props.users.length === 0 ? (
          <Empty>No users yet.</Empty>
        ) : (
          <Table
            columns={['Name', 'Email', 'Roles', '']}
            rows={props.users.map((user) => [
              <span safe>
                {user.givenName} {user.familyName}
              </span>,
              <code safe>{user.email}</code>,
              <List items={user.roles} mono />,
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
