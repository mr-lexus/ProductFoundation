# Demo Runtime Guide

## What Is Wired

This demo now shows a real request path:

```txt
web / Tauri / Capacitor shell
  ↓
packages/frontend-app
  ↓
apps/api
  ↓
hello module
```

Frontend requests `POST /rpc/hello-world` and renders the backend response metadata in the UI.

## Install

```bash
pnpm install
```

Minimum runtime:

* Node.js 20+
* pnpm 10+

For Tauri:

* Rust toolchain
* platform build tools

For Capacitor:

* Android Studio for Android
* Xcode for iOS

## Browser Demo

Run API and web app in two terminals:

```bash
pnpm dev:api
pnpm dev:web
```

Or together:

```bash
pnpm dev:demo
```

Default URLs:

* frontend: `http://127.0.0.1:1420`
* backend: `http://127.0.0.1:3001`

## Tauri Dev

Start the backend first:

```bash
pnpm dev:api
```

Then run Tauri:

```bash
pnpm tauri:dev
```

How it works:

* Tauri starts the Vite dev server through `beforeDevCommand`
* desktop webview loads `http://127.0.0.1:1420`
* frontend calls the API at `VITE_API_URL` or falls back to `http://127.0.0.1:3001`

### Windows PowerShell

```powershell
$env:VITE_API_URL="http://127.0.0.1:3001"
pnpm tauri:dev
```

### Windows CMD

```cmd
set VITE_API_URL=http://127.0.0.1:3001 && pnpm tauri:dev
```

### macOS / Linux

```bash
VITE_API_URL=http://127.0.0.1:3001 pnpm tauri:dev
```

## Tauri Production Build

This demo keeps the API outside the desktop bundle, so build the desktop shell against a reachable backend URL.

### Windows PowerShell

```powershell
$env:VITE_API_URL="https://api.example.com"
pnpm tauri:build
```

### Windows CMD

```cmd
set VITE_API_URL=https://api.example.com && pnpm tauri:build
```

### macOS / Linux

```bash
VITE_API_URL=https://api.example.com pnpm tauri:build
```

Notes:

* `pnpm tauri:build` triggers `apps/web` production build automatically
* Tauri loads bundled assets from `apps/web/dist`
* the backend in this demo is still a separate service

## Capacitor Base Setup

The Capacitor shell is configured in `apps/mobile/capacitor.config.ts`.

Add native projects once:

```bash
pnpm cap:add:android
pnpm cap:add:ios
```

Sync the shared web build into native projects:

```bash
pnpm cap:sync
```

Open the native IDE:

```bash
pnpm cap:open:android
pnpm cap:open:ios
```

## Capacitor Live Reload

For live reload, run the API and web dev servers first. Then point Capacitor to the web server with `CAP_SERVER_URL`.

### Android Emulator

Use `10.0.2.2` to reach the Windows host machine:

```powershell
$env:CAP_SERVER_URL="http://10.0.2.2:1420"
$env:VITE_API_URL="http://10.0.2.2:3001"
pnpm --filter @gtd-planner/web dev -- --host 0.0.0.0 --port 1420
```

After that:

```powershell
pnpm cap:open:android
```

### Real Android Device Or iPhone

Use your machine LAN IP instead of `127.0.0.1`.

Example:

```txt
CAP_SERVER_URL=http://192.168.1.50:1420
VITE_API_URL=http://192.168.1.50:3001
```

Then run `pnpm cap:open:android` or `pnpm cap:open:ios`.

## Platform Notes

### Windows

Supported in this demo:

* browser web
* Tauri desktop dev/build
* Capacitor Android

Not supported on Windows:

* Capacitor iOS build tooling

### macOS

Supported:

* browser web
* Tauri desktop dev/build
* Capacitor Android
* Capacitor iOS

### Linux

Supported:

* browser web
* Tauri desktop dev/build
* Capacitor Android

Not supported directly:

* Capacitor iOS
