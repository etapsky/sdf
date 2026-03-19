// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { useEffect, useState } from 'react'
import { createClient } from '../lib/api'
import { getApiKey } from '../lib/auth'

export function Dashboard() {
  const [usage, setUsage] = useState<{ uploads_count: number; storage_bytes: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const key = getApiKey()
    if (!key) {
      setError('No API key — add one in Settings')
      return
    }
    createClient(key)
      .getUsage()
      .then((u) => setUsage(u))
      .catch((e) => setError(String(e)))
  }, [])

  if (error) return <div className="card"><p className="muted">{error}</p></div>
  if (!usage) return <div className="card"><p className="muted">Loading…</p></div>

  return (
    <div>
      <h1>Dashboard</h1>
      <div className="card">
        <h2>Usage this month</h2>
        <p>Uploads: {usage.uploads_count}</p>
        <p>Storage: {(usage.storage_bytes / 1024 / 1024).toFixed(2)} MB</p>
      </div>
    </div>
  )
}
