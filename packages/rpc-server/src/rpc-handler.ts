export interface RpcActor {
  readonly kind: "service" | "user";
  readonly subjectId: string;
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

export interface RpcHandlerInvoker {
  invoke<TInput, TOutput>(options: {
    readonly context: RpcRequestContext;
    readonly handler: RpcHandler<TInput, TOutput>;
    readonly input: TInput;
    readonly procedureId: string;
  }): Promise<TOutput>;
}
