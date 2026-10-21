export type AcceptanceReader = {
  find: (
    tenant: string,
  ) => { ready: boolean; version: number; title: string } | null
  update: (tenant: string, title: string) => { version: number }
}

export type AuditRecorder = {
  recordInspection: (tenant: string) => { reference: number }
}
