import { AuthLayout } from './layout.tsx';

export function ErrorPage(props: { error: string; errorDescription?: string }) {
  return (
    <AuthLayout
      title="Something went wrong"
      heading="Something went wrong"
      subtitle={props.errorDescription ?? 'An unexpected error occurred.'}
    >
      <p class="meta">Error code: {props.error}</p>
    </AuthLayout>
  );
}
