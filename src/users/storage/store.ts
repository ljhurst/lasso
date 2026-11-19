import { docClient } from '#src/aws/dynamo.ts';
import { env } from '#src/env.ts';
import { createUserStore } from '#src/users/storage/user-store.ts';

const store = createUserStore(docClient, env.usersTableName);

export const getUserBySub = store.getBySub;
export const getUserByEmail = store.getByEmail;
export const listUsers = store.list;
export const createUser = store.create;
export const deleteUser = store.remove;
export const addRole = store.addRole;
export const removeRole = store.removeRole;
export const updatePassword = store.updatePassword;
export const setTemporaryPassword = store.setTemporaryPassword;
