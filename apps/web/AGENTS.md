# Web runtime

[Русская версия](./AGENTS-RU.md)

This shell owns browser bootstrap, Web-only PWA configuration and update UI.
Import product UI through `@app/frontend-app`; do not put product features here.
Platform identity is a literal, not a build environment switch.

Output is `apps/web/dist`. Only this shell may import PWA/Workbox modules or
register a service worker. Cache static application assets only. Navigation
fallback is for document navigations, excluding resources and foundation service
endpoints. Product offline data behavior requires its own requirements.

Run Web typechecking, the artifact check and `pnpm --filter @app/web test:pwa`
after changing PWA behavior. Initialize identity with `product:rename`; the Web
manifest is not a cross-platform identity source.
