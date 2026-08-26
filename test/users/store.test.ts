import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';

process.env.LASSO_OIDC_TABLE_NAME ??= 'lj-lasso-test';
process.env.LASSO_USERS_TABLE_NAME ??= 'lj-lasso-users-test';
process.env.LASSO_JWKS_SSM_PARAM ??= '/lasso/jwks-test';
process.env.LASSO_CLIENT__PORTO_VICTORIA_SECRET_SSM_PARAM ??=
  '/lasso/porto-victoria-client-secret-test';
process.env.LASSO_ISSUER ??= 'https://lasso.example.com';

const { getUserBySub, getUserByEmail, listUsers, addRole, updatePassword } = await import(
  '#src/users/store.ts'
);

const ddbMock = mockClient(DynamoDBDocumentClient);

const user = {
  sub: 'sub-1',
  email: 'friend@example.com',
  emailVerified: true,
  givenName: 'Friend',
  familyName: 'Person',
  passwordHash: 'hash',
  passwordSalt: 'salt',
  mustChangePassword: false,
  roles: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  ddbMock.reset();
});

describe('getUserBySub', () => {
  it('returns the user for a matching sub', async () => {
    ddbMock.on(GetCommand).resolves({ Item: user });

    expect(await getUserBySub('sub-1')).toEqual(user);
    expect(ddbMock.commandCalls(GetCommand)[0]?.args[0].input.Key).toEqual({ sub: 'sub-1' });
  });

  it('returns undefined when no item is found', async () => {
    ddbMock.on(GetCommand).resolves({});
    expect(await getUserBySub('missing')).toBeUndefined();
  });
});

describe('getUserByEmail', () => {
  it('queries the email index', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [user] });

    expect(await getUserByEmail('friend@example.com')).toEqual(user);
    const call = ddbMock.commandCalls(QueryCommand)[0]?.args[0].input;
    expect(call?.IndexName).toBe('email-index');
    expect(call?.ExpressionAttributeValues).toEqual({ ':email': 'friend@example.com' });
  });
});

describe('listUsers', () => {
  it('returns every item from the table scan', async () => {
    ddbMock.on(ScanCommand).resolves({ Items: [user] });

    expect(await listUsers()).toEqual([user]);
  });
});

describe('addRole', () => {
  it('does nothing when the user already has the role', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ...user, roles: ['porto:read'] } });

    await addRole('sub-1', 'porto:read');

    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('appends the role and writes the full list back', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ...user, roles: ['porto:read'] } });
    ddbMock.on(UpdateCommand).resolves({});

    await addRole('sub-1', 'victoria:read');

    const call = ddbMock.commandCalls(UpdateCommand)[0]?.args[0].input;
    expect(call?.Key).toEqual({ sub: 'sub-1' });
    expect(call?.ExpressionAttributeValues).toEqual({
      ':roles': ['porto:read', 'victoria:read'],
    });
  });

  it('throws when the user does not exist', async () => {
    ddbMock.on(GetCommand).resolves({});

    await expect(addRole('missing', 'porto:read')).rejects.toThrow('no user found');
  });
});

describe('updatePassword', () => {
  it('writes the new hash/salt and clears mustChangePassword', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await updatePassword('sub-1', { hash: 'new-hash', salt: 'new-salt' });

    const call = ddbMock.commandCalls(UpdateCommand)[0]?.args[0].input;
    expect(call?.Key).toEqual({ sub: 'sub-1' });
    expect(call?.ExpressionAttributeValues).toEqual({
      ':hash': 'new-hash',
      ':salt': 'new-salt',
      ':false': false,
    });
  });
});
