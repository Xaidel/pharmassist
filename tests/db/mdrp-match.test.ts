import { describe, expect, it } from 'vitest'

import {
  mdrpCeilingSeedSchema,
  medicineSeedSchema,
  type MdrpCeilingSeed,
  type MedicineSeed,
  type PriceSeed,
} from '../../scripts/seed/fixture'
import {
  expectedMdrpAttachments,
  findExactMdrpCeiling,
  moleculesFromGenericName,
  normalizeStrength,
} from '../../scripts/seed/mdrp-match'
import { ToolingError } from '../../scripts/db/database'

function medicine(overrides: Partial<MedicineSeed> = {}): MedicineSeed {
  return medicineSeedSchema.parse({
    id: 'POC-016',
    category: 'Diabetes',
    brand_name: 'Janumet',
    generic_name:
      'Metformin (as hydrochloride) + sitagliptin (as phosphate monohydrate)',
    strength: '500 mg + 50 mg',
    dosage_form: 'Film-coated tablet',
    base_unit: 'tablet',
    manufacturer: 'Patheon Puerto Rico, Inc.',
    rx_otc: 'Rx',
    fda_registration_no: 'DRP-4010',
    fda_registration_expiry: null,
    pnf_listed: false,
    pnf_entry: null,
    pnf_page: null,
    konsulta_listed: false,
    konsulta_entry: null,
    konsulta_as_of: null,
    generic_group_id: null,
    active: true,
    data_source: 'test',
    ...overrides,
  })
}

function ceiling(overrides: Partial<MdrpCeilingSeed> = {}): MdrpCeilingSeed {
  return mdrpCeilingSeedSchema.parse({
    id: 'EO104-044',
    order_id: 'EO 104 s. 2020',
    order_signed: '2020-02-17',
    annex_row: 44,
    category: 'Antidiabetic Drugs',
    molecule: 'Metformin + Sitagliptin',
    molecules: ['Metformin', 'Sitagliptin'],
    strength: '500 mg + 50 mg',
    dosage_form: 'film-coated tablet',
    pack_size: null,
    strength_and_form_raw: null,
    mwp_php: null,
    mrp_php: 30.31,
    price_basis: 'per_unit',
    price_unit: 'tablet',
    vat_exclusive_mrp: true,
    voluntary_price_reduction: false,
    source_url: 'https://example.test/eo104.pdf',
    source_pdf_page: 5,
    checked_at: '2026-10-21',
    notes: null,
    ...overrides,
  })
}

function price(overrides: Partial<PriceSeed> = {}): PriceSeed {
  return {
    medicine_id: 'POC-016',
    pharmacy_id: 'mercury-naga-penafrancia',
    sale_form: 'pack',
    sale_state: 'available',
    form_label: 'Box of 28 tablets',
    shelf_price_php: 980,
    pack_quantity: 28,
    pack_unit: 'tablet',
    stock_status: 'in_stock',
    verified_at: '2026-10-20T00:00:00Z',
    verified_by: 'poc-seed',
    source: 'poc-seed',
    notes: null,
    ...overrides,
  }
}

describe('moleculesFromGenericName', () => {
  it('strips salt forms and splits a combination', () => {
    expect(
      moleculesFromGenericName(
        'Metformin (as hydrochloride) + sitagliptin (as phosphate monohydrate)',
      ),
    ).toEqual(['metformin', 'sitagliptin'])
  })

  it('keeps a single molecule intact', () => {
    expect(
      moleculesFromGenericName('Amlodipine (as besilate/camsylate)'),
    ).toEqual(['amlodipine'])
  })
})

describe('normalizeStrength', () => {
  it('treats a combination strength as an order-insensitive set', () => {
    expect(normalizeStrength('50 mg+500 mg')).toBe(
      normalizeStrength('500 mg + 50 mg'),
    )
  })
})

describe('findExactMdrpCeiling', () => {
  it('matches an exact product regardless of molecule and strength order', () => {
    const match = findExactMdrpCeiling(
      medicine({
        generic_name: 'Sitagliptin + Metformin',
        strength: '50 mg + 500 mg',
      }),
      [ceiling()],
    )
    expect(match?.id).toBe('EO104-044')
  })

  it('never attaches a combination ceiling to a component', () => {
    const match = findExactMdrpCeiling(
      medicine({
        generic_name: 'Metformin (as hydrochloride)',
        strength: '500 mg',
      }),
      [ceiling()],
    )
    expect(match).toBeNull()
  })

  it('requires the dosage form to match', () => {
    const match = findExactMdrpCeiling(medicine({ dosage_form: 'Tablet' }), [
      ceiling(),
    ])
    expect(match).toBeNull()
  })

  it('returns a per_pack ceiling for identity matching', () => {
    const perPack = ceiling({
      id: 'EO155-001',
      price_basis: 'per_pack',
      price_unit: null,
      pack_size: '28 tablets',
    })
    expect(findExactMdrpCeiling(medicine(), [perPack])?.id).toBe('EO155-001')
  })

  it('never attaches a ceiling without a dosage form', () => {
    const match = findExactMdrpCeiling(medicine(), [
      ceiling({ dosage_form: null }),
    ])
    expect(match).toBeNull()
  })

  it('fails instead of guessing when two ceilings match', () => {
    expect(() =>
      findExactMdrpCeiling(medicine(), [
        ceiling(),
        ceiling({ id: 'EO104-099' }),
      ]),
    ).toThrow(ToolingError)
  })
})

describe('expectedMdrpAttachments', () => {
  it('attaches a per_unit ceiling to every available form', () => {
    const prices = [
      price(),
      price({
        sale_form: 'strip',
        form_label: 'Strip of 7 tablets',
        shelf_price_php: 252,
        pack_quantity: 7,
      }),
      price({
        sale_form: 'loose',
        form_label: 'Loose tablet',
        shelf_price_php: 38,
        pack_quantity: 1,
      }),
    ]
    const attachments = expectedMdrpAttachments(
      [medicine()],
      [ceiling()],
      prices,
    )
    for (const row of prices) {
      expect(
        attachments.get(
          `${row.medicine_id}\u0000${row.pharmacy_id}\u0000${row.sale_form}`,
        ),
      ).toBe('EO104-044')
    }
  })

  it('attaches a per_pack ceiling only to the matching pack observation', () => {
    const perPack = ceiling({
      id: 'EO155-001',
      price_basis: 'per_pack',
      price_unit: null,
      pack_size: '28 tablets',
    })
    const prices = [
      price(),
      price({
        sale_form: 'strip',
        form_label: 'Strip of 7 tablets',
        pack_quantity: 7,
        shelf_price_php: 252,
      }),
      price({
        pharmacy_id: 'south-star-naga-3',
        pack_quantity: 30,
        shelf_price_php: 900,
      }),
    ]
    const attachments = expectedMdrpAttachments([medicine()], [perPack], prices)
    expect(
      attachments.get('POC-016\u0000mercury-naga-penafrancia\u0000pack'),
    ).toBe('EO155-001')
    expect(
      attachments.get('POC-016\u0000mercury-naga-penafrancia\u0000strip'),
    ).toBeNull()
    expect(
      attachments.get('POC-016\u0000south-star-naga-3\u0000pack'),
    ).toBeNull()
  })

  it('never attaches to a non-available form', () => {
    const attachments = expectedMdrpAttachments(
      [medicine()],
      [ceiling()],
      [price({ sale_state: 'unknown', shelf_price_php: null })],
    )
    expect(
      attachments.get('POC-016\u0000mercury-naga-penafrancia\u0000pack'),
    ).toBeNull()
  })

  it('keeps a component unattached', () => {
    const attachments = expectedMdrpAttachments(
      [
        medicine(),
        medicine({
          id: 'POC-090',
          generic_name: 'Metformin (as hydrochloride)',
          strength: '500 mg',
        }),
      ],
      [ceiling()],
      [
        price(),
        price({
          medicine_id: 'POC-090',
          pharmacy_id: 'south-star-naga-3',
          pack_quantity: 30,
        }),
      ],
    )
    expect(
      attachments.get('POC-016\u0000mercury-naga-penafrancia\u0000pack'),
    ).toBe('EO104-044')
    expect(
      attachments.get('POC-090\u0000south-star-naga-3\u0000pack'),
    ).toBeNull()
  })
})
