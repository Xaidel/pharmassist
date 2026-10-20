# Changelog

All notable changes to this application are documented here.

## [Unreleased]

### Added

- Scaffold the POC app from `gyud-internal/tpl-fsfba-ts`: TanStack Start, React, strict TypeScript, Bun, Tailwind, and the ShadCN-compatible primitive set.
- Placeholder home route and app-shell metadata.
- PWA manifest, install and maskable icons, offline fallback, and an app-shell service worker that never caches price data or `/api/*`.
- Docker Compose stack with the app, Postgres on a named volume, and Caddy in front.
- Lint, typecheck, unit, route, browser, and capability verification scripts.
- PWA contract tests covering the manifest, icons, service worker, and registration.

### Changed

- Replace the template's ordering reference with the Pharmassist app shell.
