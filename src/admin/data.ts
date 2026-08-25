import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../adapter/client.ts';
import type { LassoItem } from '../adapter/keys.ts';
import { env } from '../env.ts';
import { getUserBySub } from '../users/store.ts';

export interface SessionRow {
  id: string;
  accountId?: string;
  expiresAt?: number;
}

export interface GrantRow {
  id: string;
  accountId?: string;
  clientId?: string;
  expiresAt?: number;
}

export interface AccessTokenRow {
  id: string;
  accountId?: string;
  clientId?: string;
  grantId?: string;
  scope?: string;
  expiresAt?: number;
}

async function scanByModel(modelName: string): Promise<LassoItem[]> {
  const result = await docClient.send(
    new ScanCommand({
      TableName: env.oidcTableName,
      FilterExpression: 'modelName = :modelName',
      ExpressionAttributeValues: { ':modelName': modelName },
    }),
  );
  return (result.Items ?? []) as LassoItem[];
}

export async function listSessions(): Promise<SessionRow[]> {
  const items = await scanByModel('Session');
  return items.map((item) => ({
    id: item.id,
    accountId: item.payload.accountId as string | undefined,
    expiresAt: item.expiresAt,
  }));
}

export async function listGrants(): Promise<GrantRow[]> {
  const items = await scanByModel('Grant');
  return items.map((item) => ({
    id: item.id,
    accountId: item.payload.accountId as string | undefined,
    clientId: item.payload.clientId as string | undefined,
    expiresAt: item.expiresAt,
  }));
}

export async function listAccessTokens(): Promise<AccessTokenRow[]> {
  const items = await scanByModel('AccessToken');
  return items.map((item) => ({
    id: item.id,
    accountId: item.payload.accountId as string | undefined,
    clientId: item.payload.clientId as string | undefined,
    grantId: item.payload.grantId as string | undefined,
    scope: item.payload.scope as string | undefined,
    expiresAt: item.expiresAt,
  }));
}

export async function resolveAccountEmails(
  accountIds: (string | undefined)[],
): Promise<Record<string, string>> {
  const distinctSubs = [...new Set(accountIds.filter((id): id is string => id !== undefined))];
  const users = await Promise.all(
    distinctSubs.map(async (sub) => [sub, await getUserBySub(sub)] as const),
  );

  const emailsBySub: Record<string, string> = {};
  for (const [sub, user] of users) {
    if (user) {
      emailsBySub[sub] = user.email;
    }
  }
  return emailsBySub;
}
