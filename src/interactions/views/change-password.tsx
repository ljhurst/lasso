import { AuthLayout, SubmitButton } from '#src/interactions/views/layout.tsx';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '#src/users/password.ts';

export function ChangePasswordPage(props: { uid: string; email: string; error?: string }) {
  return (
    <AuthLayout
      title="Set a new password"
      heading="Set a new password"
      subtitle="This account has a temporary password — choose a new one to continue."
      error={props.error}
    >
      <form method="post" action={`/interaction/${props.uid}/change-password`}>
        <input type="hidden" name="email" value={props.email} />
        <label for="current">Temporary password</label>
        <input
          type="password"
          id="current"
          name="current"
          autocomplete="current-password"
          required
        />
        <label for="password">New password</label>
        <input
          type="password"
          id="password"
          name="password"
          autocomplete="new-password"
          minlength={MIN_PASSWORD_LENGTH}
          maxlength={MAX_PASSWORD_LENGTH}
          required
        />
        <label for="confirm">Confirm new password</label>
        <input type="password" id="confirm" name="confirm" autocomplete="new-password" required />
        <SubmitButton label="Set password" />
      </form>
    </AuthLayout>
  );
}
