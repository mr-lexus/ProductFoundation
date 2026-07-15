const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const globalScopeStorageId = "00000000-0000-0000-0000-000000000000";

declare const tenantIdBrand: unique symbol;
declare const userIdBrand: unique symbol;

export type TenantId = string & { readonly [tenantIdBrand]: true };
export type UserId = string & { readonly [userIdBrand]: true };

export interface GlobalScope {
  readonly kind: "global";
}

export interface TenantScope {
  readonly kind: "tenant";
  readonly tenantId: TenantId;
}

export type OperationScope = GlobalScope | TenantScope;

export const globalScope: GlobalScope = Object.freeze({ kind: "global" });

export type RequestActor =
  | { readonly kind: "user"; readonly userId: UserId }
  | { readonly kind: "service"; readonly serviceId: string };

export interface AuthorizedRequestContext {
  readonly actor: RequestActor;
  readonly requestId: string;
  readonly scope: OperationScope;
}

function parseUuid<T extends string>(value: string, label: string): T {
  if (!uuidPattern.test(value)) {
    throw new Error(`${label} must be a UUID.`);
  }
  return value as T;
}

export function createTenantId(value: string): TenantId {
  return parseUuid<TenantId>(value, "tenantId");
}

export function createUserId(value: string): UserId {
  return parseUuid<UserId>(value, "userId");
}

export function serializeOperationScope(scope: OperationScope) {
  return scope.kind === "global" ? globalScopeStorageId : scope.tenantId;
}

export function deserializeOperationScope(value: string): OperationScope {
  return value === globalScopeStorageId
    ? globalScope
    : { kind: "tenant", tenantId: createTenantId(value) };
}
