export interface RpcActor {
  readonly kind: "service" | "user";
  readonly subjectId: string;
}

export interface RpcRequestContext<TExecution = undefined> {
  readonly actor: RpcActor | null;
  readonly execution: TExecution;
  readonly idempotencyKey: string | null;
  readonly receivedAt: Date;
  readonly requestId: string;
  readonly signal: AbortSignal;
}

export type RpcHandler<TInput, TOutput, TExecution = undefined> = (
  input: TInput,
  context: RpcRequestContext<TExecution>
) => Promise<TOutput> | TOutput;

export interface RpcHandlerInvoker<TExecution = undefined> {
  invoke<TInput, TOutput>(options: {
    readonly context: RpcRequestContext<undefined>;
    readonly handler: RpcHandler<TInput, TOutput, TExecution>;
    readonly input: TInput;
    readonly procedureId: string;
    readonly validateOutput: (output: unknown) => TOutput;
  }): Promise<TOutput>;
}
