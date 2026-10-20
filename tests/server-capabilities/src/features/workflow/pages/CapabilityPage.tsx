import { useEffect, useState } from 'react'
import { isRedirect, isNotFound } from '@tanstack/react-router'
import { recordAudit } from '../../audit/audit.functions'
import {
  writeDraft,
  evaluateAcceptance,
} from '../../authoring/authoring.functions'
import {
  changeTitle,
  inspectDraft,
  nestedRead,
  nestedContext,
  recordInspection,
  nestedRedirect,
  nestedMissing,
} from '../workflow.functions'

export function CapabilityPage() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    setHydrated(true)
  }, [])
  const [result, setResult] = useState('ready')
  const [tenant, setTenant] = useState('alpha')
  const [credential, setCredential] = useState('alpha')
  const [text, setText] = useState('Draft title')
  async function run(
    action:
      | 'rpc-write'
      | 'rpc-read'
      | 'internal-write'
      | 'internal-read'
      | 'nested'
      | 'context'
      | 'audit'
      | 'redirect'
      | 'missing'
      | 'rpc-audit',
  ) {
    const headers = { authorization: `Bearer ${credential}` }
    try {
      const value =
        action === 'rpc-write'
          ? await writeDraft({ data: { tenant, text }, headers })
          : action === 'rpc-read'
            ? await evaluateAcceptance({ data: { tenant }, headers })
            : action === 'internal-write'
              ? await changeTitle({ data: { tenant, title: text }, headers })
              : action === 'internal-read'
                ? await inspectDraft({ data: { tenant }, headers })
                : action === 'rpc-audit'
                  ? await recordAudit({
                      data: { tenant, action: 'acceptance-inspected' },
                      headers,
                    })
                  : // Deliberate bare-call probes; production redirecting calls use useServerFn.
                    action === 'redirect'
                    ? await nestedRedirect()
                    : action === 'missing'
                      ? await nestedMissing()
                      : action === 'context'
                        ? await nestedContext({ headers })
                        : action === 'audit'
                          ? await recordInspection({
                              data: { tenant },
                              headers,
                            })
                          : await nestedRead({ data: { tenant }, headers })
      setResult(JSON.stringify(value))
    } catch (error) {
      if (isRedirect(error)) {
        setResult('REDIRECT')
        return
      }
      if (isNotFound(error)) {
        setResult('NOT_FOUND')
        return
      }
      setResult(error instanceof Error ? error.message : String(error))
    }
  }
  return (
    <main>
      <h1>Server capability fixture</h1>
      <label>
        Tenant
        <input
          value={tenant}
          onChange={(event) => setTenant(event.target.value)}
        />
      </label>
      <label>
        Credential
        <input
          value={credential}
          onChange={(event) => setCredential(event.target.value)}
        />
      </label>
      <label>
        Text
        <input value={text} onChange={(event) => setText(event.target.value)} />
      </label>
      {(
        [
          'rpc-write',
          'rpc-read',
          'internal-write',
          'internal-read',
          'nested',
          'context',
          'audit',
          'redirect',
          'missing',
          'rpc-audit',
        ] as const
      ).map((action) => (
        <button key={action} disabled={!hydrated} onClick={() => run(action)}>
          {action}
        </button>
      ))}
      <output aria-label="Result">{result}</output>
    </main>
  )
}
