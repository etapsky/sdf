// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { useState } from 'react'
import { getApiKey, setApiKey, clearApiKey } from '../lib/auth'

export function Settings() {
  const [key, setKey] = useState(getApiKey() ?? '')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    if (key.trim()) setApiKey(key.trim())
    else clearApiKey()
    setSaved(true)
  }

  return (
    <div>
      <h1>Settings</h1>
      <div className="card">
        <h2>API Key</h2>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sdf_xxxxxxxx..."
          style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem' }}
        />
        <button onClick={handleSave}>Save</button>
        {saved && <span className="muted" style={{ marginLeft: '0.5rem' }}>Saved</span>}
      </div>
    </div>
  )
}
