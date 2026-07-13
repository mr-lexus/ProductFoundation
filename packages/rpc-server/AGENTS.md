# AI Development Rules — RPC Server

This package executes `@product-foundation/rpc` procedures without NestJS or
Fastify. It owns boundary validation, envelopes, request/idempotency metadata
and application-error mapping. Transport adapters supply actor, abort signal
and structured error logging explicitly.
