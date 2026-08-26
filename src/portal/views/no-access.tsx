import { AuthLayout, SubmitButton } from '../../interactions/views/layout.tsx';

export function NoAccessPage() {
  return (
    <AuthLayout
      title="No access"
      heading="No access"
      subtitle="This account doesn't have access to the Lasso admin portal. If you were just granted access, log out and log back in."
    >
      <form method="post" action="/portal/logout">
        <SubmitButton label="Log out" />
      </form>
    </AuthLayout>
  );
}
