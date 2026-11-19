import type { User } from '#src/users/types.ts';
import { aboutUser, ConfirmPage } from '#src/portal/admin/views/components/confirm-page.tsx';
import { adminUrl } from '#src/portal/paths.ts';

export function DeleteUserPage(props: { user: User }) {
  const { user } = props;
  return (
    <ConfirmPage
      title="Delete user"
      heading="Delete this user?"
      {...aboutUser(user)}
      action={adminUrl.deleteUser(user.sub)}
      submitLabel="Delete user"
      tone="danger"
    >
      <li>Signs them out everywhere</li>
      <li>Ends their grants and access tokens</li>
      <li>Removes their account. This can't be undone.</li>
      <li>Apps keep any data stored under their user ID</li>
    </ConfirmPage>
  );
}
