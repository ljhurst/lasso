import type { User } from '#src/users/types.ts';
import { CopyButton } from '#src/portal/views/components/copy-button.tsx';
import { Facts } from '#src/portal/views/components/facts.tsx';
import { Time } from '#src/portal/views/components/time.tsx';
import { Layout } from '#src/portal/views/layout.tsx';

export function TemporaryPasswordPage(props: {
  mode: 'created' | 'reset';
  user: User;
  tempPassword: string;
  expiresAt?: number;
}) {
  const { mode, user } = props;
  const heading = `${mode === 'created' ? 'Created' : 'Password reset for'} ${user.givenName} ${user.familyName}`;
  return (
    <Layout title="Temporary password" active="/admin/users" isAdmin={true}>
      <section>
        <h2 safe>{heading}</h2>
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
              <a class="row-action primary" href={`/admin/users/${user.sub}`}>
                Add roles
              </a>
              <a class="row-action" href="/admin/users/new">
                Add another
              </a>
            </>
          ) : (
            <a class="row-action primary" href={`/admin/users/${user.sub}`}>
              Back to user
            </a>
          )}
        </div>
      </section>
    </Layout>
  );
}
