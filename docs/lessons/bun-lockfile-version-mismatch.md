# A Bun 1.4 lockfile cannot be read by Bun 1.3

`app/bun.lock` uses lockfile version 2, which Bun 1.4 writes and Bun 1.3 rejects with `Unknown lockfile version`. With `--frozen-lockfile` the install then fails; without it, Bun silently ignores the lockfile and resolves fresh.

If the machine's global Bun is older than the version in `app/.bun-version`, run the pinned version instead of changing the lockfile:

```sh
npx -y bun@1.4.2 install --frozen-lockfile
npx -y bun@1.4.2 run verify
```

Do not regenerate the lockfile with the older runtime; that downgrades the format for every other contributor and defeats the pinned toolchain.

`bun run verify` also runs `tests/server-capabilities/run.ts`, which spawns plain `bun` from `PATH` for the staged fixture. When the global Bun is older, prepend the pinned Bun's directory to `PATH` for the whole verify run; otherwise the parent scripts use 1.4.2 and the fixture children fall back to the older runtime and fail the same lockfile check.
