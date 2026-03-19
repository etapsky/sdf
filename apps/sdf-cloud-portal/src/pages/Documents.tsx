// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { useEffect, useState } from 'react'
import { createClient } from '../lib/api'
import { getApiKey } from '../lib/auth'

export function Documents() {
  const [data, setData] = useState<{ documents: unknown[]; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const key = getApiKey()
    if (!key) { setError('No API key'); return }
    createClient(key)
      .list()
      .then(setData)
      .catch((e) => setError(String(e)))
  }, [])

  if (error) return <div className="card"><p className="muted">{error}</p></div>
  if (!data) return <div className="card"><p className="muted">Loading…</p></div>

  return (
    <div>
      <h1>Documents</h1>
      <div className="card">
        <h2>Recent ({data.total})</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {data.documents.map((d: unknown) => (
            <li key={String((d as { id?: string }).id ?? (d as { documentId?: string }).documentId)}>
              {String((d as { documentId?: string }).documentId ?? (d as { id?: string }).id)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
