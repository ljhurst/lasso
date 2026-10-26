import { DeleteCommand, DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearLoginAttempts,
  MAX_FAILED_LOGINS,
  reserveLoginAttempt,
} from '#src/users/login-throttle.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);

const WINDOW_SECONDS = 15 * 60;
const NOW = new Date('2026-01-01T00:07:30.000Z');
const WINDOW = Math.floor(NOW.getTime() / 1000 / WINDOW_SECONDS);

beforeEach(() => {
  ddbMock.reset();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('reserveLoginAttempt', () => {
  it('counts the attempt in the current window for this account and address', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    expect(await reserveLoginAttempt('sub-1', '203.0.113.7')).toBe(true);

    const input = ddbMock.commandCalls(UpdateCommand)[0]?.args[0].input;
    expect(input?.TableName).toBe('lj-lasso-throttle-test');
    expect(input?.Key).toEqual({ pk: `sub-1:203.0.113.7:${WINDOW}` });
    expect(input?.UpdateExpression).toContain('ADD attempts :one');
    expect(input?.ConditionExpression).toBe('attribute_not_exists(attempts) OR attempts < :max');
    expect(input?.ExpressionAttributeValues?.[':max']).toBe(MAX_FAILED_LOGINS);
  });

  it('expires the item after its window so TTL can clean it up', async () => {
    ddbMock.on(UpdateCommand).resolves({});

    await reserveLoginAttempt('sub-1', '203.0.113.7');

    const input = ddbMock.commandCalls(UpdateCommand)[0]?.args[0].input;
    const windowEnd = (WINDOW + 1) * WINDOW_SECONDS;
    expect(input?.ExpressionAttributeValues?.[':expiresAt']).toBeGreaterThan(windowEnd);
  });

  it('reports a locked pair when the condition fails', async () => {
    ddbMock
      .on(UpdateCommand)
      .rejects(Object.assign(new Error('limit'), { name: 'ConditionalCheckFailedException' }));

    expect(await reserveLoginAttempt('sub-1', '203.0.113.7')).toBe(false);
  });

  it('propagates any other error instead of skipping the throttle', async () => {
    ddbMock.on(UpdateCommand).rejects(new Error('dynamodb is down'));

    await expect(reserveLoginAttempt('sub-1', '203.0.113.7')).rejects.toThrow('dynamodb is down');
  });
});

describe('clearLoginAttempts', () => {
  it('deletes the current window for this account and address', async () => {
    ddbMock.on(DeleteCommand).resolves({});

    await clearLoginAttempts('sub-1', '203.0.113.7');

    const input = ddbMock.commandCalls(DeleteCommand)[0]?.args[0].input;
    expect(input?.TableName).toBe('lj-lasso-throttle-test');
    expect(input?.Key).toEqual({ pk: `sub-1:203.0.113.7:${WINDOW}` });
  });
});
