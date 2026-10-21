/** Registers the app-shell service worker when the browser supports it. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) {
    return
  }

  void navigator.serviceWorker.register('/sw.js').catch(() => undefined)
}
