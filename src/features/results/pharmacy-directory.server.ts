import { queryRows } from '#/lib/db.server'

import { cheapestOverallPharmacyId } from './pharmacy-directory.domain'
import {
  pharmacyDirectoryResponseSchema,
  type PharmacyDirectoryResponse,
} from './pharmacy-directory.schema'
import { createResultsRepository } from './results.repository.server'

const repository = createResultsRepository(queryRows)

/** List every seeded pharmacy and mark the cheapest overall verified one. */
export async function handlePharmacyDirectory(): Promise<PharmacyDirectoryResponse> {
  const [pharmacies, rates] = await Promise.all([
    repository.readPharmacies(),
    repository.readUnitRates(),
  ])
  const verifiedIds = new Set(
    pharmacies
      .filter((pharmacy) => pharmacy.verification_status === 'verified')
      .map((pharmacy) => pharmacy.pharmacy_id),
  )

  return pharmacyDirectoryResponseSchema.parse({
    pharmacies: pharmacies.map((pharmacy) => ({
      pharmacy_id: pharmacy.pharmacy_id,
      name: pharmacy.name,
      latitude: pharmacy.latitude,
      longitude: pharmacy.longitude,
      verification_status: pharmacy.verification_status,
    })),
    cheapest_pharmacy_id: cheapestOverallPharmacyId(rates, verifiedIds),
  })
}
