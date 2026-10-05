# ADR 0012: Web-only PWA lifecycle

[Русская версия](./0012-web-only-pwa-RU.md)

- Status: accepted
- Date: 2026-10-04

## Context

An installable Web baseline needs a manifest, icons and a maintainable worker
lifecycle. Native shells must never package or register that worker. Product
offline data semantics are unknown.

## Decision

- Web uses vite-plugin-pwa generateSW and explicit prompt-based registration.
- Cache only the application shell/static assets, with no API runtime cache,
  mutation queue, replication or conflict handling.
- Workbox NavigationRoute limits fallback to navigation requests. In-scope SPA
  documents use index.html; resource URLs and existing rpc/health/metrics service
  paths are excluded. This does not establish an `/api` convention.
- Updates offer Reload/Later. No custom hourly or foreground update polling.
- Development does not register the worker. Native roots do not import PWA code.
- product:rename updates platform-specific placeholders, including Web manifest
  name/short name. Web metadata is not canonical identity for other platforms.
- Mandatory browser tests cover registration, offline shell navigation and API
  non-caching. Two-build update E2E is optional until demonstrated stable.

## Consequences

Web gains persistent client-side shell state and deployment cache requirements.
Installation UI varies by browser. Product data remains network-dependent, and
release signing/native updating remain separate product responsibilities.

Web declares `workbox-window` directly: pnpm's isolated dependency resolution
could not resolve the virtual registration module's import from the plugin's
transitive dependencies alone. `vite-plugin-pwa` and Playwright are development
dependencies; `workbox-window` supplies the browser registration implementation.
