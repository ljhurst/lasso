import { describe, expect, it } from 'vitest';
import { accountStatus, STATUS_LABEL } from '#src/users/status.ts';

describe('accountStatus', () => {
  it('is waiting while the temporary password has not been changed', () => {
    expect(accountStatus({ mustChangePassword: true })).toBe('waiting');
  });

  it('is active once they have set their own password', () => {
    expect(accountStatus({ mustChangePassword: false })).toBe('active');
  });

  it('has a label for each status', () => {
    expect(STATUS_LABEL).toEqual({ waiting: "Hasn't signed in yet", active: 'Active' });
  });
});
