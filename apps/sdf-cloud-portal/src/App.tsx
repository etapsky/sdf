// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1

import { Routes, Route, Link } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { Documents } from './pages/Documents'
import { Billing } from './pages/Billing'
import { ApiKeys } from './pages/ApiKeys'
import { Settings } from './pages/Settings'

export default function App() {
  return (
    <div className="app">
      <nav className="sidebar">
        <h1>SDF Cloud</h1>
        <Link to="/">Dashboard</Link>
        <Link to="/documents">Documents</Link>
        <Link to="/api-keys">API Keys</Link>
        <Link to="/billing">Billing</Link>
        <Link to="/settings">Settings</Link>
      </nav>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/api-keys" element={<ApiKeys />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
