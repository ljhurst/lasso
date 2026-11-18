import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addRole,
  createUser,
  deleteUser,
  getUserByEmail,
  getUserBySub,
  listUsers,
  removeRole,
  updatePassword,
} from '#src/users/store.ts';

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

  it('matches regardless of case or surrounding whitespace', async () => {
    ddbMock.on(QueryCommand).resolves({ Items: [user] });

    await getUserByEmail('  Friend@Example.COM ');
    const call = ddbMock.commandCalls(QueryCommand)[0]?.args[0].input;
    expect(call?.ExpressionAttributeValues).toEqual({ ':email': 'friend@example.com' });
  });
});

describe('createUser', () => {
  it('writes the user only when no one holds that sub, aliasing the reserved word', async () => {
    ddbMock.on(PutCommand).resolves({});

    await createUser(user);

    const call = ddbMock.commandCalls(PutCommand)[0]?.args[0].input;
    expect(call?.Item).toEqual(user);
    expect(call?.ConditionExpression).toBe('attribute_not_exists(#sub)');
    expect(call?.ExpressionAttributeNames).toEqual({ '#sub': 'sub' });
  });
});

describe('deleteUser', () => {
  it('deletes the item for the sub', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    await deleteUser('sub-1');

    expect(ddbMock.commandCalls(DeleteCommand)[0]?.args[0].input.Key).toEqual({ sub: 'sub-1' });
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

describe('removeRole', () => {
  it('does nothing when the user does not have the role', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ...user, roles: ['porto:read'] } });

    await removeRole('sub-1', 'victoria:read');

    expect(ddbMock.commandCalls(UpdateCommand)).toHaveLength(0);
  });

  it('drops the role and writes the remaining list back', async () => {
    ddbMock.on(GetCommand).resolves({ Item: { ...user, roles: ['porto:read', 'victoria:read'] } });
    ddbMock.on(UpdateCommand).resolves({});

    await removeRole('sub-1', 'porto:read');

    const call = ddbMock.commandCalls(UpdateCommand)[0]?.args[0].input;
    expect(call?.Key).toEqual({ sub: 'sub-1' });
    expect(call?.ExpressionAttributeValues).toEqual({ ':roles': ['victoria:read'] });
  });

  it('throws when the user does not exist', async () => {
    ddbMock.on(GetCommand).resolves({});

    await expect(removeRole('missing', 'porto:read')).rejects.toThrow('no user found');
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
