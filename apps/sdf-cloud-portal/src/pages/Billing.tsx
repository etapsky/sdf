// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { useEffect, useState } from 'react'
import { createClient } from '../lib/api'
import { getApiKey } from '../lib/auth'

export function Billing() {
  const [usage, setUsage] = useState<unknown>(null)
  const [plans, setPlans] = useState<unknown[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const key = getApiKey()
    if (!key) { setError('No API key'); return }
    Promise.all([createClient(key).getUsage(), createClient(key).getPlans()])
      .then(([u, p]) => { setUsage(u); setPlans(p as unknown[]) })
      .catch((e) => setError(String(e)))
  }, [])

  if (error) return <div className="card"><p className="muted">{error}</p></div>

  return (
    <div>
      <h1>Billing</h1>
      <div className="card">
        <h2>Usage</h2>
        <pre style={{ fontSize: '0.85rem' }}>{JSON.stringify(usage, null, 2)}</pre>
      </div>
      <div className="card">
        <h2>Plans</h2>
        <ul>
          {plans.map((p: unknown) => (
            <li key={(p as { name?: string }).name}>
              {(p as { name?: string }).name} — {(p as { price_cents?: number }).price_cents != null ? `$${((p as { price_cents?: number }).price_cents! / 100).toFixed(2)}/mo` : 'Custom'}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
