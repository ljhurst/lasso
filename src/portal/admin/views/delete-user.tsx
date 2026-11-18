import type { User } from '#src/users/types.ts';
import { Facts, Layout } from '#src/portal/views/layout.tsx';

export function DeleteUserPage(props: { user: User }) {
  const { user } = props;
  return (
    <Layout title="Delete user" active="/admin/users" isAdmin={true}>
      <section>
        <h2>Delete this user?</h2>
        <Facts
          items={[
            {
              label: 'Name',
              value: (
                <span safe>
                  {user.givenName} {user.familyName}
                </span>
              ),
            },
            { label: 'Email', value: <code safe>{user.email}</code> },
          ]}
        />
      </section>
      <section>
        <h2>What happens</h2>
        <ul class="consequences">
          <li>Signs them out everywhere</li>
          <li>Ends their grants and access tokens</li>
          <li>Removes their account. This can't be undone.</li>
          <li>Apps keep any data stored under their user ID</li>
        </ul>
        <form class="actions" method="post" action={`/admin/users/${user.sub}/delete`}>
          <button type="submit" class="row-action danger">
            Delete user
          </button>
          <a class="row-action" href={`/admin/users/${user.sub}`}>
            Cancel
          </a>
        </form>
      </section>
    </Layout>
  );
}
