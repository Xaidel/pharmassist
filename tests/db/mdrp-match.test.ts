import { describe, expect, it } from 'vitest'

import {
  mdrpCeilingSeedSchema,
  medicineSeedSchema,
  type MdrpCeilingSeed,
  type MedicineSeed,
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
    pack_size: 'Box of 28 tablets',
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
        pack_size: 'Box of 100 tablets',
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

  it('ignores a medicine pack for a per_unit ceiling', () => {
    const match = findExactMdrpCeiling(
      medicine({ pack_size: 'Box of 7 tablets' }),
      [ceiling()],
    )
    expect(match?.id).toBe('EO104-044')
  })

  it('requires the pack to match for a per_pack ceiling', () => {
    const perPack = ceiling({
      id: 'EO155-001',
      price_basis: 'per_pack',
      price_unit: null,
      pack_size: 'Box of 28 tablets',
    })
    expect(findExactMdrpCeiling(medicine(), [perPack])?.id).toBe('EO155-001')
    expect(
      findExactMdrpCeiling(medicine({ pack_size: 'Box of 30 tablets' }), [
        perPack,
      ]),
    ).toBeNull()
    expect(
      findExactMdrpCeiling(medicine({ pack_size: null }), [perPack]),
    ).toBeNull()
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
  it('maps the exact match and keeps components unattached', () => {
    const attachments = expectedMdrpAttachments(
      [
        medicine(),
        medicine({
          id: 'POC-090',
          generic_name: 'Metformin (as hydrochloride)',
          strength: '500 mg',
          pack_size: 'Box of 100 tablets',
        }),
      ],
      [ceiling()],
    )
    expect(attachments.get('POC-016')).toBe('EO104-044')
    expect(attachments.get('POC-090')).toBeNull()
  })
})
