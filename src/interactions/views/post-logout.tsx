import { AuthLayout } from '#src/interactions/views/layout.tsx';

export function PostLogoutPage(props: { clientName?: string }) {
  return (
    <AuthLayout
      title="Signed out"
      heading="Signed out"
      subtitle={
        props.clientName
          ? `You've been signed out of Lasso for ${props.clientName}.`
          : "You've been signed out of Lasso."
      }
    >
      <p class="meta">You can close this window.</p>
    </AuthLayout>
  );
}
