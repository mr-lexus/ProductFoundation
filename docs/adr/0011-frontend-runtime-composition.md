# ADR 0011: Independent frontend runtime composition and artifacts

- Status: accepted
- Date: 2026-10-04

## Context

All frontend builds previously used the Web entrypoint and overwrote Web's dist.
This coupled native packaging to Web assets and made concurrent builds unsafe.
The shared application already accepted configuration and the RPC client already
supported an injected fetch implementation.

## Decision

- Each frontend shell owns index.html, its main entrypoint, Vite configuration,
  platform literal and a local dist directory.
- One `@app/frontend-app` owns all product UI and flows.
- Bootstrap injects configuration and fetch directly into the concrete API
  client. The API provider exposes the operations currently consumed by features.
- There is no generic runtime context, capability registry or service locator.
- Future native capabilities receive separate explicit abstractions only when
  actual consumers require them.
- Shared dependencies build once before concurrent frontend runtime builds.
- Development origins use distinct strict ports to isolate Web service workers.
- Native configuration stays at the composition edge. Tooling helpers under
  scripts are shared by launchers/configuration, not imported by product features.

## Consequences

Three small bootstrap/configuration files are intentional runtime wiring, not
three product applications. Web deployment keeps its existing dist path. Native
packaging paths change and generated mobile projects must be synced afterward.
Cross-shell dependencies and artifact overlap are executable architecture errors.

Repository-specific adjustments: the shared native tooling helper uses `.mts`
because the existing Capacitor configuration typecheck uses NodeNext resolution.
The first Windows Cargo check exposed a missing `icons/icon.ico`; Windows/macOS
icon containers were generated from the existing neutral PNG with the existing
Tauri CLI. No new asset-generation dependency or product identity source was added.
