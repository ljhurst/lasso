import { describe, expect, it } from 'vitest';
import { accountStatus, isTemporaryPasswordExpired, STATUS_LABEL } from '#src/users/status.ts';

const NOW = 1_800_000_000;
const FUTURE = NOW + 60;
const PAST = NOW - 60;

describe('accountStatus', () => {
  it('is active once they have set their own password', () => {
    expect(accountStatus({ mustChangePassword: false }, NOW)).toBe('active');
  });

  it('ignores a leftover expiry on someone who has set their own password', () => {
    expect(accountStatus({ mustChangePassword: false, tempPasswordExpiresAt: PAST }, NOW)).toBe(
      'active',
    );
  });

  it('is waiting for a new user on a temporary password', () => {
    expect(accountStatus({ mustChangePassword: true, tempPasswordExpiresAt: FUTURE }, NOW)).toBe(
      'waiting',
    );
  });

  it('is reset for an existing user on a temporary password after a reset', () => {
    expect(
      accountStatus(
        {
          mustChangePassword: true,
          tempPasswordExpiresAt: FUTURE,
          passwordResetAt: '2026-01-01T00:00:00.000Z',
        },
        NOW,
      ),
    ).toBe('reset');
  });

  it.each([
    ['a new user', {}],
    ['a reset user', { passwordResetAt: '2026-01-01T00:00:00.000Z' }],
  ])('is expired for %s once the temporary password has lapsed', (_name, extra) => {
    expect(
      accountStatus({ mustChangePassword: true, tempPasswordExpiresAt: PAST, ...extra }, NOW),
    ).toBe('expired');
  });

  it('is waiting when a temporary password predates expiries', () => {
    expect(accountStatus({ mustChangePassword: true }, NOW)).toBe('waiting');
  });

  it('has a label for each status', () => {
    expect(STATUS_LABEL).toEqual({
      active: 'Active',
      waiting: "Hasn't signed in yet",
      reset: "Password reset, hasn't signed in",
      expired: 'Temporary password expired',
    });
  });
});

describe('isTemporaryPasswordExpired', () => {
  it('counts an expiry of exactly now as expired', () => {
    expect(
      isTemporaryPasswordExpired({ mustChangePassword: true, tempPasswordExpiresAt: NOW }, NOW),
    ).toBe(true);
  });

  it('is false before the expiry', () => {
    expect(
      isTemporaryPasswordExpired({ mustChangePassword: true, tempPasswordExpiresAt: FUTURE }, NOW),
    ).toBe(false);
  });

  it('is false with no expiry', () => {
    expect(isTemporaryPasswordExpired({ mustChangePassword: true }, NOW)).toBe(false);
  });

  it('is false for someone on their own password', () => {
    expect(
      isTemporaryPasswordExpired({ mustChangePassword: false, tempPasswordExpiresAt: PAST }, NOW),
    ).toBe(false);
  });
});
