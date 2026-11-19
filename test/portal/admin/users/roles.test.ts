import {
  DynamoDBDocumentClient,
  GetCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { beforeEach, describe, expect, it } from 'vitest';
import { assignRole } from '#src/portal/admin/users/roles.ts';
import { grantRow, PORTO, stubGrant, stubProvider } from '../support.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

beforeEach(() => {
  ddbMock.reset();
});

describe('assignRole', () => {
  it('adds the role before revoking the grants that rejected it', async () => {
    const calls: string[] = [];
    ddbMock.on(GetCommand).resolves({ Item: { sub: 'sub-1', roles: ['porto:read'] } });
    ddbMock.on(UpdateCommand).callsFake(async () => {
      calls.push('add-role');
    });
    ddbMock.on(ScanCommand).resolves({ Items: [grantRow('g-1', 'sub-1')] });
    const grants = {
      'g-1': stubGrant('g-1', { [PORTO]: 'porto:read' }, calls, { [PORTO]: 'porto:write' }),
    };

    await assignRole(stubProvider(grants, calls), 'sub-1', 'porto:write');

    expect(calls).toEqual([
      'add-role',
      'revoke-at:g-1',
      'revoke-code:g-1',
      'revoke-rt:g-1',
      'destroy:g-1',
    ]);
  });
});
