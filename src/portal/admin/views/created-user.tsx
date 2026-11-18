import type { User } from '#src/users/types.ts';
import { CopyButton, Facts, Layout } from '#src/portal/views/layout.tsx';

export function CreatedUserPage(props: { user: User; tempPassword: string }) {
  const { user } = props;
  return (
    <Layout title="User created" active="/admin/users" isAdmin={true}>
      <section>
        <h2 safe>
          Created {user.givenName} {user.familyName}
        </h2>
        <Facts items={[{ label: 'Email', value: <code safe>{user.email}</code> }]} />
      </section>
      <section>
        <h2>Temporary password</h2>
        <div class="command-row">
          <code class="sub" id="temp-password" safe>
            {props.tempPassword}
          </code>
          <CopyButton target="temp-password" />
        </div>
        <p class="empty">
          Shown once. Give it to them directly. They choose their own password when they first sign
          in. They can't open any app until you add a role.
        </p>
        <div class="actions">
          <a class="row-action primary" href={`/admin/users/${user.sub}`}>
            Add roles
          </a>
          <a class="row-action" href="/admin/users/new">
            Add another
          </a>
        </div>
      </section>
    </Layout>
  );
}
