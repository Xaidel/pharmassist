import {
  Bandage,
  Package,
  Pill,
  PillBottle,
  Tablets,
  TestTube,
  Wind,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '#/lib/cn'
import { Badge } from '#/shared/components/ui/badge'
import type { BaseUnit } from '#/shared/domain/medicine-summary'

/** The exact-product identity a medicine line renders. */
export type MedicineLineMedicine = {
  brand_name: string | null
  generic_name: string
  strength: string
  dosage_form: string
  base_unit: BaseUnit
  rx_otc: 'Rx' | 'OTC'
}

type MedicineKind = {
  label: string
  icon: LucideIcon
  /** Text, border, and tint classes for the kind's colour. */
  tone: string
}

const PILL_TONE = 'border-kind-pill/30 bg-kind-pill/10 text-kind-pill'

// What the medicine physically is, from the unit it is counted in.
const KINDS: Record<BaseUnit, MedicineKind> = {
  tablet: { label: 'Tablet', icon: Tablets, tone: PILL_TONE },
  capsule: { label: 'Capsule', icon: Pill, tone: PILL_TONE },
  mL: {
    label: 'Bottle',
    icon: PillBottle,
    tone: 'border-kind-liquid/30 bg-kind-liquid/10 text-kind-liquid',
  },
  g: {
    label: 'Tube',
    icon: Bandage,
    tone: 'border-kind-topical/30 bg-kind-topical/10 text-kind-topical',
  },
  actuation: {
    label: 'Inhaler',
    icon: Wind,
    tone: 'border-kind-inhaler/30 bg-kind-inhaler/10 text-kind-inhaler',
  },
  'unit-dose': {
    label: 'Vial',
    icon: TestTube,
    tone: 'border-kind-other/30 bg-kind-other/10 text-kind-other',
  },
  sachet: {
    label: 'Sachet',
    icon: Package,
    tone: 'border-kind-other/30 bg-kind-other/10 text-kind-other',
  },
}

type MedicineLineProps = {
  medicine: MedicineLineMedicine
}

/** Render one exact product's identity in search and price results. */
export function MedicineLine({
  medicine,
}: MedicineLineProps): React.JSX.Element {
  const primaryName = medicine.brand_name ?? medicine.generic_name
  const kind = KINDS[medicine.base_unit]
  const KindIcon = kind.icon
  // Skip the dosage form when it only repeats the kind, such as "Tablet".
  const showForm =
    medicine.dosage_form.toLowerCase() !== kind.label.toLowerCase()

  return (
    <div className="flex flex-col gap-1">
      {/* The Rx/OTC badge keeps the top-right corner however long the names run. */}
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0">
          <span className="font-semibold text-foreground">{primaryName}</span>
          {medicine.brand_name !== null && (
            <span className="text-sm text-muted-foreground">
              {' '}
              {medicine.generic_name}
            </span>
          )}
        </p>
        <Badge
          className="shrink-0"
          variant={medicine.rx_otc === 'Rx' ? 'primary' : 'default'}
        >
          {medicine.rx_otc}
        </Badge>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
        {/* The kind chip carries a word as well as a colour, so colour is never the only cue. */}
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-semibold',
            kind.tone,
          )}
        >
          <KindIcon aria-hidden="true" className="size-4" />
          {kind.label}
        </span>
        <span className="font-semibold text-foreground">
          {medicine.strength}
        </span>
        {showForm && (
          <span className="text-muted-foreground">
            · {medicine.dosage_form}
          </span>
        )}
      </p>
    </div>
  )
}
