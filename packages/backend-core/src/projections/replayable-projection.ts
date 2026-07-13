import type { ClaimedOutboxMessage } from "../messaging/outbox.js";

export interface ReplayableProjection {
  readonly name: string;
  apply(message: ClaimedOutboxMessage, signal?: AbortSignal): Promise<void>;
  reset(signal?: AbortSignal): Promise<void>;
}
