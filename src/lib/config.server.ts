import { z } from 'zod'

const appEnvSchema = z.enum(['dev', 'test', 'pilot'])

const databaseUrlSchema = z
  .string()
  .min(1, 'DATABASE_URL is required')
  .refine(
    (value) =>
      value.startsWith('postgres://') || value.startsWith('postgresql://'),
    'DATABASE_URL must be a postgres:// or postgresql:// URL',
  )

const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

const scanProviderSchema = z.enum(['mock', 'cloud-vision'])

const serverConfigSchema = z.object({
  databaseUrl: databaseUrlSchema,
  appEnv: appEnvSchema,
  nagaCenter: coordinateSchema,
  routingBaseUrl: z.url(),
  scanProvider: scanProviderSchema,
  scanCloudVisionEnabled: z.boolean().default(false),
})

/** Runtime environments the application recognizes. */
export type AppEnv = z.infer<typeof appEnvSchema>

/** Validated environment values the server needs at runtime. */
export type ServerConfig = z.infer<typeof serverConfigSchema>

/** Read and validate the server environment on first use. */
export function readServerConfig(
  env: NodeJS.ProcessEnv = process.env,
): ServerConfig {
  return serverConfigSchema.parse({
    databaseUrl: env.DATABASE_URL,
    appEnv: env.APP_ENV ?? 'dev',
    nagaCenter: {
      latitude: Number(env.NAGA_CENTER_LAT ?? '13.6215'),
      longitude: Number(env.NAGA_CENTER_LNG ?? '123.1945'),
    },
    routingBaseUrl: env.ROUTING_BASE_URL ?? 'https://router.project-osrm.org',
    scanProvider: (env.SCAN_PROVIDER ?? 'mock') as 'mock' | 'cloud-vision',
    scanCloudVisionEnabled: env.SCAN_CLOUD_VISION_ENABLED === 'true',
  })
}
