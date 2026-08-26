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
          <Table columns={['Name', 'Email', 'Roles', '']}>
            {props.users.map((user) => (
              <tr>
                <td>
                  {user.givenName} {user.familyName}
                </td>
                <td>
                  <code>{user.email}</code>
                </td>
                <td>
                  <List items={user.roles} mono />
                </td>
                <td>
                  <a href={`/admin/users/${user.sub}`}>View</a>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </Layout>
  );
}
