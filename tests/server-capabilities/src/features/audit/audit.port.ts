import type { AuditEntry } from './audit.domain'

export type AuditSink = { append: (entry: AuditEntry) => number }
