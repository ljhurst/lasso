import {
  DeleteCommand,
  type DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { scanAll } from '#src/aws/dynamo.ts';
import { normalizeEmail } from '#src/users/email.ts';
import type { TemporaryPassword } from '#src/users/provision.ts';
import {
  type ExpressionUpdate,
  passwordUpdate,
  rolesUpdate,
  temporaryPasswordUpdate,
} from '#src/users/storage/expressions.ts';
import type { User } from '#src/users/types.ts';

export interface UserStore {
  getBySub(sub: string): Promise<User | undefined>;
  getByEmail(email: string): Promise<User | undefined>;
  list(): Promise<User[]>;
  create(user: User): Promise<void>;
  remove(sub: string): Promise<void>;
  addRole(sub: string, role: string): Promise<void>;
  removeRole(sub: string, role: string): Promise<void>;
  updatePassword(sub: string, password: { hash: string; salt: string }): Promise<void>;
  setTemporaryPassword(sub: string, temp: TemporaryPassword): Promise<void>;
}

/** Stores users in `tableName`; callers pass the table client so scripts and the app share this code. */
export function createUserStore(db: DynamoDBDocumentClient, tableName: string): UserStore {
  async function update(sub: string, change: ExpressionUpdate): Promise<void> {
    await db.send(new UpdateCommand({ TableName: tableName, Key: { sub }, ...change }));
  }

  async function mustGet(sub: string): Promise<User> {
    const user = await store.getBySub(sub);
    if (!user) {
      throw new Error(`no user found for sub ${sub}`);
    }
    return user;
  }

  const store: UserStore = {
    async getBySub(sub) {
      const result = await db.send(new GetCommand({ TableName: tableName, Key: { sub } }));
      return result.Item as User | undefined;
    },

    async getByEmail(email) {
      const result = await db.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: 'email-index',
          KeyConditionExpression: 'email = :email',
          ExpressionAttributeValues: { ':email': normalizeEmail(email) },
          Limit: 1,
        }),
      );
      return result.Items?.[0] as User | undefined;
    },

    async list() {
      return (await scanAll(db, { TableName: tableName })) as unknown as User[];
    },

    async create(user) {
      await db.send(
        new PutCommand({
          TableName: tableName,
          Item: user,
          ConditionExpression: 'attribute_not_exists(#sub)',
          ExpressionAttributeNames: { '#sub': 'sub' },
        }),
      );
    },

    async remove(sub) {
      await db.send(new DeleteCommand({ TableName: tableName, Key: { sub } }));
    },

    async addRole(sub, role) {
      const user = await mustGet(sub);
      if (!user.roles.includes(role)) {
        await update(sub, rolesUpdate([...user.roles, role]));
      }
    },

    async removeRole(sub, role) {
      const user = await mustGet(sub);
      if (user.roles.includes(role)) {
        await update(sub, rolesUpdate(user.roles.filter((r) => r !== role)));
      }
    },

    async updatePassword(sub, password) {
      await update(sub, passwordUpdate(password));
    },

    async setTemporaryPassword(sub, temp) {
      await update(sub, temporaryPasswordUpdate(temp, new Date().toISOString()));
    },
  };
  return store;
}
