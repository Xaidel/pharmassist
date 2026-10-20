import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

const appRoot = new URL('..', import.meta.url)

type ManifestIcon = {
  src: string
  sizes: string
  type: string
  purpose: string
}

type Manifest = {
  name: string
  short_name: string
  start_url: string
  scope: string
  display: string
  icons: ManifestIcon[]
}

async function readManifest(): Promise<Manifest> {
  const raw = await readFile(
    new URL('public/manifest.webmanifest', appRoot),
    'utf8',
  )
  return JSON.parse(raw) as Manifest
}

describe('PWA manifest', () => {
  it('declares an installable, same-origin app shell', async () => {
    const manifest = await readManifest()

    expect(manifest.name).toBe('Pharmassist POC')
    expect(manifest.short_name).toBe('Pharmassist')
    expect(manifest.start_url).toBe('/')
    expect(manifest.scope).toBe('/')
    expect(manifest.display).toBe('standalone')
  })

  it('ships 192, 512, and maskable icons', async () => {
    const manifest = await readManifest()
    const sizes = manifest.icons.map((icon) => icon.sizes)

    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(
      true,
    )

    for (const icon of manifest.icons) {
      const bytes = await readFile(new URL(`public${icon.src}`, appRoot)).catch(
        () => null,
      )

      expect(bytes, `${icon.src} is missing`).not.toBeNull()
      expect(bytes?.length ?? 0).toBeGreaterThan(0)
      if (bytes) {
        const pixels = `${String(bytes.readUInt32BE(16))}x${String(bytes.readUInt32BE(20))}`
        expect(pixels).toBe(icon.sizes)
      }
    }
  })
})

describe('app-shell service worker', () => {
  it('precaches only the offline shell and bypasses API requests', async () => {
    const source = await readFile(new URL('public/sw.js', appRoot), 'utf8')

    expect(source).toContain("addEventListener('install'")
    expect(source).toContain("addEventListener('activate'")
    expect(source).toContain("addEventListener('fetch'")
    expect(source).toContain("url.pathname.startsWith('/api/')")
    expect(source).toContain("'/offline.html'")
    expect(source).toContain("request.mode === 'navigate'")
  })

  it('provides an offline fallback shell', async () => {
    const shell = await readFile(
      new URL('public/offline.html', appRoot),
      'utf8',
    )

    expect(shell).toContain('You are offline.')
    expect(shell).toContain('prices and pharmacy data are not stored')
  })
})

describe('app-shell registration', () => {
  it('links the manifest and registers the service worker', async () => {
    const root = await readFile(
      new URL('src/routes/__root.tsx', appRoot),
      'utf8',
    )

    expect(root).toContain("rel: 'manifest'")
    expect(root).toContain('registerServiceWorker')
  })
})
