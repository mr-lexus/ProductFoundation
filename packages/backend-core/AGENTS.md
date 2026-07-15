# AI Development Rules — Backend Core

`@product-foundation/backend-core` contains only framework-neutral application
ports, global/tenant operation scope, durable orchestration and shared backend
types.

Never import NestJS, Fastify, PostgreSQL drivers, metrics SDKs, React or product
packages here. Do not add product entities, permissions or workflows. External
effects are interfaces supplied by a composition root.

Prefer small explicit ports over generic repositories or service locators. A
change must remain usable by at least two unrelated product domains in concept
and must be covered through a package or consumer test.
