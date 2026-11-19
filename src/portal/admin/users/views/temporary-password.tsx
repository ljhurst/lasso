import type { User } from '#src/users/types.ts';
import { emailFact } from '#src/portal/admin/users/views/person-facts.tsx';
import { CopyButton } from '#src/portal/views/components/copy-button.tsx';
import { Facts } from '#src/portal/views/components/facts.tsx';
import { Time } from '#src/portal/views/components/time.tsx';
import { AdminLayout } from '#src/portal/admin/views/components/admin-layout.tsx';
import { adminUrl } from '#src/portal/paths.ts';
import { fullName } from '#src/users/name.ts';

export function TemporaryPasswordPage(props: {
  mode: 'created' | 'reset';
  user: User;
  tempPassword: string;
  expiresAt?: number;
}) {
  const { mode, user } = props;
  const heading = `${mode === 'created' ? 'Created' : 'Password reset for'} ${fullName(user)}`;
  return (
    <AdminLayout
      section="users"
      title="Temporary password"
      crumbs={[{ label: fullName(user), href: adminUrl.user(user.sub) }]}
    >
      <section>
        <h2 safe>{heading}</h2>
        <Facts items={[emailFact(user)]} />
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
          Shown once. Give it to them directly. They choose their own password when they{' '}
          {mode === 'created' ? 'first sign in' : 'next sign in'}.
          {mode === 'created' ? " They can't open any app until you add a role." : ''}
        </p>
        {props.expiresAt === undefined ? null : (
          <p class="empty">
            Expires <Time seconds={props.expiresAt} />
          </p>
        )}
        <div class="actions">
          {mode === 'created' ? (
            <>
              <a class="row-action primary" href={adminUrl.user(user.sub)}>
                Add roles
              </a>
              <a class="row-action" href={adminUrl.newUser()}>
                Add another
              </a>
            </>
          ) : (
            <a class="row-action primary" href={adminUrl.user(user.sub)}>
              Back to user
            </a>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}
