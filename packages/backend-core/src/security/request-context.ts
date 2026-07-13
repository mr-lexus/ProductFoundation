const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

declare const workspaceIdBrand: unique symbol;
declare const userIdBrand: unique symbol;

export type WorkspaceId = string & { readonly [workspaceIdBrand]: true };
export type UserId = string & { readonly [userIdBrand]: true };

export interface WorkspaceScope {
  readonly workspaceId: WorkspaceId;
}

export type RequestActor =
  | { readonly kind: "user"; readonly userId: UserId }
  | { readonly kind: "service"; readonly serviceId: string };

export interface AuthorizedRequestContext {
  readonly actor: RequestActor;
  readonly requestId: string;
  readonly workspace: WorkspaceScope;
}

function parseUuid<T extends string>(value: string, label: string): T {
  if (!uuidPattern.test(value)) {
    throw new Error(`${label} must be a UUID.`);
  }
  return value as T;
}

export function createWorkspaceId(value: string): WorkspaceId {
  return parseUuid<WorkspaceId>(value, "workspaceId");
}

export function createUserId(value: string): UserId {
  return parseUuid<UserId>(value, "userId");
}
