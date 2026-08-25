import { AuthLayout, SubmitButton } from './layout.tsx';

export function ChangePasswordPage(props: { uid: string; sub: string; error?: string }) {
  return (
    <AuthLayout
      title="Set a new password"
      heading="Set a new password"
      subtitle="This account has a temporary password — choose a new one to continue."
      error={props.error}
    >
      <form method="post" action={`/interaction/${props.uid}/change-password`}>
        <input type="hidden" name="sub" value={props.sub} />
        <label for="password">New password</label>
        <input type="password" id="password" name="password" autocomplete="new-password" required />
        <label for="confirm">Confirm new password</label>
        <input type="password" id="confirm" name="confirm" autocomplete="new-password" required />
        <SubmitButton label="Set password" />
      </form>
    </AuthLayout>
  );
}
