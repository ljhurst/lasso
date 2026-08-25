import { AuthLayout, SubmitButton } from './layout.tsx';

export function LoginPage(props: { uid: string; error?: string }) {
  return (
    <AuthLayout title="Sign in" heading="Sign in" subtitle="Lasso" error={props.error}>
      <form method="post" action={`/interaction/${props.uid}/login`}>
        <label for="email">Email</label>
        <input type="email" id="email" name="email" autocomplete="username" required />
        <label for="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          autocomplete="current-password"
          required
        />
        <SubmitButton label="Sign in" />
      </form>
    </AuthLayout>
  );
}
