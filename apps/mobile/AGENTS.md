# Capacitor runtime

[Русская версия](./AGENTS-RU.md)

This shell owns its Vite entrypoint, Capacitor configuration and native adapters.
Product UI comes from `@app/frontend-app`. Never import another application shell.
Output is `apps/mobile/dist`; Capacitor packages only this directory.
PWA assets and service-worker registration are forbidden.

Keep API origins explicit and HTTPS for production/CI. Live reload is available
only through the explicit local development path. Preserve exact packaged
origins unless their API allowlists, tests and documentation change together.

`check` remains the Capacitor configuration typecheck; `check:frontend` checks
the frontend. Run `pnpm check:native` for native configuration changes.
Initialize product identity before generating ignored Android/iOS projects.
