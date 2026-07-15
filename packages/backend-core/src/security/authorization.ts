import type { AuthorizedRequestContext } from "./request-context.js";

export type Permission = `${string}:${string}`;

export interface AuthorizationPolicy {
  allows(context: AuthorizedRequestContext, permission: Permission): Promise<boolean>;
}

export class AuthorizationDeniedError extends Error {
  readonly code = "FORBIDDEN";

  constructor() {
    super("The actor is not allowed to perform this operation.");
    this.name = "AuthorizationDeniedError";
  }
}

export async function requirePermission(
  policy: AuthorizationPolicy,
  context: AuthorizedRequestContext,
  permission: Permission
) {
  if (!(await policy.allows(context, permission))) {
    throw new AuthorizationDeniedError();
  }
}

export const denyByDefaultAuthorizationPolicy: AuthorizationPolicy = {
  async allows() {
    return false;
  }
};
