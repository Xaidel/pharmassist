# Run browser acceptance from the Playwright image on a Windows host

On a Windows host without Bun, `bun run test:e2e` cannot run directly. Run it in the Playwright image that matches `@playwright/test`, add Bun, and point `DATABASE_URL` at the Compose Postgres through `host.docker.internal`:

```sh
sed 's/127\.0\.0\.1:5434/host.docker.internal:5434/' .env > /tmp/docker.env
MSYS_NO_PATHCONV=1 docker run --rm --add-host=host.docker.internal:host-gateway \
  --env-file /tmp/docker.env -e CI=1 \
  -v "$(pwd -W):/app" -v pharmassist-nm-pw:/app/node_modules -w /app \
  mcr.microsoft.com/playwright:v1.61.1-noble \
  bash -c "npm i -g bun@1.4.2 && bun install --frozen-lockfile && bun run build && bunx playwright test"
```

- Give it its own `node_modules` volume. The Playwright image is glibc; a volume installed from `oven/bun:*-alpine` holds musl native binaries.
- Do not mount a volume at `/app/.output`. Nitro deletes that directory before each build, and a mount point cannot be removed: the build fails with `EBUSY: resource busy or locked, rm '/app/.output/'`. `.output/` is gitignored, so let the build write it to the bind mount.
