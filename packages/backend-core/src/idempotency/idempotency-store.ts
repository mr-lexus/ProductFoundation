import { createHash } from "node:crypto";
import type { WorkspaceScope } from "../security/request-context.js";

export type IdempotencyClaim =
  | { readonly kind: "acquired" }
  | { readonly kind: "conflict" }
  | { readonly kind: "in_progress" }
  | {
      readonly kind: "replay";
      readonly responseBody: unknown;
      readonly responseStatus: number;
    };

export interface IdempotencyKey {
  readonly key: string;
  readonly procedureId: string;
  readonly requestHash: string;
  readonly workspace: WorkspaceScope;
}

export interface IdempotencyStore {
  claim(
    key: IdempotencyKey,
    options: { readonly leaseMs: number; readonly ttlMs: number }
  ): Promise<IdempotencyClaim>;

  complete(
    key: IdempotencyKey,
    response: { readonly body: unknown; readonly status: number }
  ): Promise<void>;

  release(key: IdempotencyKey): Promise<void>;
}

export function hashIdempotencyPayload(payload: string | Uint8Array) {
  return createHash("sha256").update(payload).digest("hex");
}
