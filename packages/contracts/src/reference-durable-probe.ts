import { defineRpcProcedure } from "@product-foundation/rpc";
import { z } from "zod";

export const referenceDurableProbeCreateInputSchema = z.object({
  id: z.string().uuid(),
  value: z.string().min(1).max(128)
});

export const referenceDurableProbeSchema = z.object({
  createdAt: z.string().datetime(),
  deliveredAt: z.string().datetime().nullable(),
  id: z.string().uuid(),
  value: z.string()
});

export const referenceDurableProbeCreateOutputSchema = referenceDurableProbeSchema.omit({
  deliveredAt: true
});

export const referenceDurableProbeStatusInputSchema = z.object({
  id: z.string().uuid()
});

export type ReferenceDurableProbeCreateInput = z.infer<
  typeof referenceDurableProbeCreateInputSchema
>;
export type ReferenceDurableProbeCreateOutput = z.infer<
  typeof referenceDurableProbeCreateOutputSchema
>;
export type ReferenceDurableProbe = z.infer<typeof referenceDurableProbeSchema>;
export type ReferenceDurableProbeStatusInput = z.infer<
  typeof referenceDurableProbeStatusInputSchema
>;

export const referenceDurableProbeCreateRpcContract = defineRpcProcedure({
  id: "reference-durable-probe.create",
  inputSchema: referenceDurableProbeCreateInputSchema,
  kind: "mutation",
  method: "POST",
  outputSchema: referenceDurableProbeCreateOutputSchema,
  path: "/rpc/v1/reference-durable-probe-create"
});

export const referenceDurableProbeStatusRpcContract = defineRpcProcedure({
  id: "reference-durable-probe.status",
  inputSchema: referenceDurableProbeStatusInputSchema,
  kind: "query",
  method: "POST",
  outputSchema: referenceDurableProbeSchema,
  path: "/rpc/v1/reference-durable-probe-status"
});
