import { TEMP_PASSWORD_TTL_DAYS } from '#src/users/provision.ts';
import type { User } from '#src/users/types.ts';
import { Facts, Layout } from '#src/portal/views/layout.tsx';

export function ResetPasswordPage(props: { user: User }) {
  const { user } = props;
  return (
    <Layout title="Reset password" active="/admin/users" isAdmin={true}>
      <section>
        <h2>Reset this password?</h2>
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
          <li>Replaces their password with a temporary one</li>
          <li>Signs them out everywhere</li>
          <li>The temporary password works for {TEMP_PASSWORD_TTL_DAYS} days</li>
          <li>You see it once, on the next page</li>
        </ul>
        <form
          class="actions"
          method="post"
          action={`/admin/users/${user.sub}/reset-password`}
          data-once
        >
          <button type="submit" class="row-action caution">
            Reset password
          </button>
          <a class="row-action" href={`/admin/users/${user.sub}`}>
            Cancel
          </a>
        </form>
      </section>
    </Layout>
  );
}
