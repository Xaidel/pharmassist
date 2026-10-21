import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // MapLibre ships its own ESM worker. Vite's dep optimizer rewrites the
  // worker URL into a pre-bundled file the browser cannot start in dev.
  optimizeDeps: { exclude: ['maplibre-gl'] },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    nitro({ preset: 'bun' }),
  ],
})
