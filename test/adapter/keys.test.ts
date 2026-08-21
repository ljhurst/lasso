import { describe, expect, it } from 'vitest';

import { primaryKey, toItem, uidIndexKey } from '../../src/adapter/keys.ts';

describe('primaryKey', () => {
  it('namespaces the id by model name', () => {
    expect(primaryKey('AccessToken', 'abc123')).toBe('AccessToken#abc123');
  });
});

describe('uidIndexKey', () => {
  it('namespaces the uid by model name', () => {
    expect(uidIndexKey('Session', 'sess-1')).toBe('Session#sess-1');
  });
});

describe('toItem', () => {
  it('builds the primary key and copies the payload', () => {
    const item = toItem('AuthorizationCode', 'code-1', { grantId: 'grant-1' });

    expect(item.pk).toBe('AuthorizationCode#code-1');
    expect(item.modelName).toBe('AuthorizationCode');
    expect(item.payload).toEqual({ grantId: 'grant-1' });
    expect(item.grantId).toBe('grant-1');
  });

  it('sets expiresAt from expiresIn', () => {
    const before = Math.floor(Date.now() / 1000);
    const item = toItem('AccessToken', 'token-1', {}, 3600);
    const after = Math.floor(Date.now() / 1000);

    expect(item.expiresAt).toBeGreaterThanOrEqual(before + 3600);
    expect(item.expiresAt).toBeLessThanOrEqual(after + 3600);
  });

  it('omits expiresAt when expiresIn is not given', () => {
    const item = toItem('Client', 'client-1', {});
    expect(item.expiresAt).toBeUndefined();
  });

  it('populates the uid GSI attribute scoped by model name', () => {
    const item = toItem('Interaction', 'interaction-1', { uid: 'uid-1' });
    expect(item.uid).toBe('Interaction#uid-1');
  });

  it('populates the userCode GSI attribute for device codes', () => {
    const item = toItem('DeviceCode', 'device-1', { userCode: 'ABCD-EFGH' });
    expect(item.userCode).toBe('ABCD-EFGH');
  });

  it('omits GSI attributes the payload does not carry', () => {
    const item = toItem('Grant', 'grant-1', {});
    expect(item.uid).toBeUndefined();
    expect(item.grantId).toBeUndefined();
    expect(item.userCode).toBeUndefined();
  });
});
