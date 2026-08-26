import { AuthLayout } from '#src/interactions/views/layout.tsx';

export function LogoutPage(props: { form: string; clientName?: string }) {
  return (
    <AuthLayout
      title="Sign out"
      heading="Sign out?"
      subtitle={
        props.clientName ? `Sign out of Lasso for ${props.clientName}?` : 'Sign out of Lasso?'
      }
    >
      {props.form}
      <div class="actions">
        <button autofocus type="submit" form="op.logoutForm" name="logout" value="yes">
          Yes, sign me out
        </button>
        <button class="secondary" type="submit" form="op.logoutForm">
          No, stay signed in
        </button>
      </div>
    </AuthLayout>
  );
}
