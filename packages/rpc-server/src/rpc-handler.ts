export interface RpcActor {
  readonly userId: string;
  readonly workspaceId: string;
}

export interface RpcRequestContext {
  readonly actor: RpcActor | null;
  readonly idempotencyKey: string | null;
  readonly receivedAt: Date;
  readonly requestId: string;
  readonly signal: AbortSignal;
}

export type RpcHandler<TInput, TOutput> = (
  input: TInput,
  context: RpcRequestContext
) => Promise<TOutput> | TOutput;
