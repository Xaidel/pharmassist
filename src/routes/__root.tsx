import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { registerServiceWorker } from '#/lib/service-worker'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        name: 'description',
        content:
          'Pharmassist POC: medicine price and availability map for Naga City.',
      },
      { name: 'robots', content: 'noindex' },
      { name: 'theme-color', content: '#1f7a5c' },
      { title: 'Pharmassist POC' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'manifest', href: '/manifest.webmanifest' },
      { rel: 'icon', href: '/icons/icon-192.png', type: 'image/png' },
      { rel: 'apple-touch-icon', href: '/icons/icon-192.png' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({
  children,
}: Readonly<{ children: ReactNode }>): React.JSX.Element {
  useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
