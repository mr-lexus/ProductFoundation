# Tauri runtime

This shell owns its Vite entrypoint, Rust bootstrap, CSP and desktop adapters.
Product UI comes from `@app/frontend-app`. Never import another application shell.
Output is `apps/desktop/dist`; Tauri packages only this directory.
PWA assets and service-worker registration are forbidden.

Keep API origins explicit and derive CSP from the same validated origin used by
the frontend. Preserve the Windows HTTP custom-protocol mapping and macOS/Linux
custom origins unless their tests and documented allowlists change together.

`check` remains Cargo checking, and `dev`/`build` remain Tauri commands.
Use `check:frontend`, `dev:frontend` and `build:runtime` for frontend-only work.
Run `pnpm check:native` after native configuration changes.
