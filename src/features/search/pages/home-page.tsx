import { Badge } from '#/shared/components/ui/badge'

import { SearchExperience } from '../components/search-experience'

/** Render the POC's search-first home screen. */
export function HomePage(): React.JSX.Element {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-bold uppercase tracking-eyebrow-wide text-primary">
            Pharmassist POC
          </p>
          <Badge variant="primary">Demo data</Badge>
        </div>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-semibold leading-display tracking-tight sm:text-5xl">
          Know the shelf price before you leave.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Search medicines and compare seeded prices across 10 real Naga
          pharmacy locations. Small spelling mistakes still find the product.
        </p>
      </header>

      <SearchExperience />

      <footer className="mt-10 border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
        Seeded demo environment. Pharmacy names and locations are real; prices,
        stock, and verification dates are mocked. No accounts, prescriptions, or
        patient data are stored by this app.
      </footer>
    </main>
  )
}
