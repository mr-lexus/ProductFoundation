export type TraceAttributes = Readonly<Record<string, boolean | number | string>>;

export interface TracePort {
  inSpan<T>(name: string, attributes: TraceAttributes, work: () => Promise<T>): Promise<T>;
}

export const noOpTracePort: TracePort = {
  inSpan(_name, _attributes, work) {
    return work();
  }
};
