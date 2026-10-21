# MapLibre's ESM worker needs an explicit Vite URL in dev and in the build

`maplibre-gl` 6 ships a self-contained ESM worker (`maplibre-gl-worker.mjs`) and computes its location at runtime from `import.meta.url` plus the fixed filename. Two separate failures follow:

- **Dev:** Vite's dependency optimizer serves the main module from `node_modules/.vite/deps/`, so the derived worker URL is `node_modules/.vite/deps/maplibre-gl-worker.mjs`, which fails with `net::ERR_FAILED`.
- **Build:** the main module is emitted as a hashed chunk under `assets/`, but Vite cannot see the computed `new URL(...)` and never copies the worker next to it. The browser requests `assets/maplibre-gl-worker.mjs`, which does not exist.

Both produce the same misleading symptom: the canvas, attribution, and custom DOM markers still render, but the basemap stays blank. A browser test that only counts markers or asserts the attribution will pass while the map is empty.

Fix both by importing the worker as a Vite URL asset and registering it before the map is constructed:

```ts
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

const module = await import('maplibre-gl')
module.setWorkerUrl(maplibreWorkerUrl)
const map = new module.Map({ ... })
```

Keep MapLibre out of dependency optimization so dev serves the package's own module graph:

```ts
export default defineConfig({
  optimizeDeps: { exclude: ['maplibre-gl'] },
})
```

Restart the dev server after changing the Vite config. Add a regression check for the specific worker console error or failed worker request; canvas presence and markers do not prove the basemap rendered.
