import { TEMP_PASSWORD_TTL_DAYS } from '#src/users/provision.ts';
import type { User } from '#src/users/types.ts';
import { aboutUser, ConfirmPage } from '#src/portal/admin/views/components/confirm-page.tsx';
import { adminUrl } from '#src/portal/paths.ts';

export function ResetPasswordPage(props: { user: User }) {
  const { user } = props;
  return (
    <ConfirmPage
      title="Reset password"
      heading="Reset this password?"
      {...aboutUser(user)}
      action={adminUrl.resetPassword(user.sub)}
      submitLabel="Reset password"
      tone="caution"
    >
      <li>Replaces their password with a temporary one</li>
      <li>Signs them out everywhere</li>
      <li>The temporary password works for {TEMP_PASSWORD_TTL_DAYS} days</li>
      <li>You see it once, on the next page</li>
    </ConfirmPage>
  );
}
