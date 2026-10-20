import { Badge } from '#/shared/components/ui/badge'
import { Card, CardContent, CardHeader } from '#/shared/components/ui/card'

const foundations = [
  {
    title: 'App shell',
    description:
      'TanStack Start, React, strict TypeScript, Tailwind, and the shared UI primitives are wired.',
  },
  {
    title: 'Local stack',
    description:
      'Docker Compose runs the app behind Caddy with Postgres ready on a named volume.',
  },
  {
    title: 'Installable PWA',
    description:
      'The manifest, icons, and app-shell service worker are in place. Price data is never cached.',
  },
]

/** Renders the placeholder app shell for the POC. */
export function HomePage(): React.JSX.Element {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="border-b border-border pb-10">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-eyebrow-wide text-primary">
            Pharmassist POC
          </p>
          <Badge variant="primary">Demo</Badge>
        </div>
        <h1 className="mt-4 max-w-3xl font-display text-5xl font-semibold leading-display tracking-tight sm:text-6xl">
          The scaffold is up.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          This is the app shell for the medicine price-and-availability POC.
          Search, map results, basket ranking, pharmacy detail, prescription
          scan, and price reports arrive in later slices. No business features
          are implemented yet.
        </p>
      </header>

      <section
        aria-label="Scaffold status"
        className="mt-10 grid gap-4 sm:grid-cols-3"
      >
        {foundations.map((foundation) => (
          <Card key={foundation.title}>
            <CardHeader>
              <h2 className="font-display text-xl font-semibold">
                {foundation.title}
              </h2>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {foundation.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <footer className="mt-12 border-t border-border pt-6 text-sm text-muted-foreground">
        Seeded demo environment. No accounts, prescriptions, or patient data are
        stored by this shell.
      </footer>
    </main>
  )
}
