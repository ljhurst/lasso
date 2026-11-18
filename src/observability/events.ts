export type AuthEvent =
  | { event: 'login_succeeded'; sub: string; ip: string }
  | {
      event: 'login_failed';
      reason: 'unknown_user' | 'throttled' | 'bad_password';
      sub?: string;
      ip: string;
    }
  | { event: 'temporary_password_accepted'; sub: string; ip: string }
  | { event: 'password_changed'; sub: string; ip: string }
  | { event: 'user_created'; sub: string; by: string }
  | { event: 'user_deleted'; sub: string; by: string }
  | { event: 'token_issued'; clientId?: string; sub?: string; grantType?: string }
  | { event: 'oidc_error'; kind: string; clientId?: string; message: string };

export interface RequestEvent {
  event: 'request';
  method: string;
  path: string;
  status: number;
  ms: number;
  ip: string;
  clientId?: string;
  error?: string;
}

export function logEvent(entry: AuthEvent | RequestEvent): void {
  console.log(JSON.stringify(entry));
}
