import { Badge } from '#/shared/components/ui/badge'

/** The exact-product identity a medicine line renders. */
export type MedicineLineMedicine = {
  brand_name: string | null
  generic_name: string
  strength: string
  dosage_form: string
  pack_size: string | null
  rx_otc: 'Rx' | 'OTC'
}

type MedicineLineProps = {
  medicine: MedicineLineMedicine
}

/** Render one exact product's identity in search and price results. */
export function MedicineLine({
  medicine,
}: MedicineLineProps): React.JSX.Element {
  const primaryName = medicine.brand_name ?? medicine.generic_name

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="font-semibold text-foreground">{primaryName}</span>
        {medicine.brand_name !== null && (
          <span className="text-sm text-muted-foreground">
            {medicine.generic_name}
          </span>
        )}
        <Badge variant={medicine.rx_otc === 'Rx' ? 'primary' : 'default'}>
          {medicine.rx_otc}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {medicine.strength} · {medicine.dosage_form}
        {medicine.pack_size !== null ? ` · ${medicine.pack_size}` : ''}
      </p>
    </div>
  )
}
