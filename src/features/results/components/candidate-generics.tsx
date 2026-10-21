import { Badge } from '#/shared/components/ui/badge'
import { Card, CardContent, CardHeader } from '#/shared/components/ui/card'
import type { MedicineSummary } from '#/shared/domain/medicine-summary'

import type { ResultsResponse } from '../results.schema'

type CandidateGenericsProps = {
  groups: ResultsResponse['candidate_generics']
  medicines: readonly MedicineSummary[]
}

/** Render candidate generic alternatives separately from the price ranking. */
export function CandidateGenerics({
  groups,
  medicines,
}: CandidateGenericsProps): React.JSX.Element | null {
  if (groups.length === 0) {
    return null
  }

  const medicineById = new Map(
    medicines.map((medicine) => [medicine.medicine_id, medicine]),
  )

  return (
    <Card className="mt-10">
      <CardHeader>
        <h2 className="font-display text-2xl font-semibold">
          Candidate generic alternatives
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          These are display-only candidates. They are not price results and are
          not a therapeutic-equivalence claim. Ask a pharmacist before
          switching.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {groups.map((group) => {
            const medicine = medicineById.get(group.for_medicine_id)
            const label =
              medicine === undefined
                ? group.for_medicine_id
                : (medicine.brand_name ?? medicine.generic_name)
            return (
              <section key={group.for_medicine_id}>
                <h3 className="text-sm font-semibold uppercase tracking-eyebrow text-muted-foreground">
                  For {label}
                </h3>
                <ul className="mt-2 space-y-2">
                  {group.items.map((item) => (
                    <li
                      className="rounded-2xl border border-border bg-background p-3"
                      key={`${group.for_medicine_id}-${item.brand_name}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{item.brand_name}</span>
                        <Badge
                          variant={item.rx_otc === 'Rx' ? 'primary' : 'default'}
                        >
                          {item.rx_otc}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[item.manufacturer, item.reference_pack_size]
                          .filter((value) => value !== null)
                          .join(' · ')}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {item.note}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
