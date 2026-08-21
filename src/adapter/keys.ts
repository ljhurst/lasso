export interface AdapterPayload {
  uid?: string;
  grantId?: string;
  userCode?: string;
  [key: string]: unknown;
}

export interface LassoItem {
  pk: string;
  modelName: string;
  id: string;
  payload: AdapterPayload;
  consumed?: boolean;
  expiresAt?: number;
  uid?: string;
  grantId?: string;
  userCode?: string;
}

export function primaryKey(modelName: string, id: string): string {
  return `${modelName}#${id}`;
}

export function uidIndexKey(modelName: string, uid: string): string {
  return `${modelName}#${uid}`;
}

export function toItem(
  modelName: string,
  id: string,
  payload: AdapterPayload,
  expiresIn?: number,
): LassoItem {
  const item: LassoItem = {
    pk: primaryKey(modelName, id),
    modelName,
    id,
    payload,
  };

  if (expiresIn !== undefined) {
    item.expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  }
  if (payload.uid !== undefined) {
    item.uid = uidIndexKey(modelName, payload.uid);
  }
  if (payload.grantId !== undefined) {
    item.grantId = payload.grantId;
  }
  if (payload.userCode !== undefined) {
    item.userCode = payload.userCode;
  }

  return item;
}
