import type { OperationScope, RequestActor } from "../security/request-context.js";

export type AuditMetadataValue = boolean | number | string | null;

export interface AuditEvent {
  readonly action: `${string}.${string}`;
  readonly actor: RequestActor;
  readonly id: string;
  readonly metadata: Readonly<Record<string, AuditMetadataValue>>;
  readonly occurredAt: Date;
  readonly outcome: "allowed" | "denied" | "failed" | "succeeded";
  readonly requestId: string;
  readonly scope: OperationScope;
  readonly targetId?: string;
  readonly targetType?: string;
}

export interface AuditSink {
  record(event: AuditEvent): Promise<void>;
}
