// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useState } from 'react'

interface Props {
  data: Record<string, unknown>;
}

function ValueNode({ value, depth = 0 }: { value: unknown; depth?: number }) {
  const [open, setOpen] = useState(depth < 2)

  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>null</span>
  }

  if (typeof value === 'boolean') {
    return <span style={{ color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: '11px' }}>{String(value)}</span>
  }

  if (typeof value === 'number') {
    return <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: '11px' }}>{value}</span>
  }

  if (typeof value === 'string') {
    // Detect monetary amount pattern
    if (/^\d+(\.\d+)?$/.test(value)) {
      return <span style={{ color: 'var(--teal2)', fontFamily: 'var(--mono)', fontSize: '11px' }}>{value}</span>
    }
    // Detect UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return <span style={{ color: 'var(--accent2)', fontFamily: 'var(--mono)', fontSize: '11px' }}>{value}</span>
    }
    // Detect ISO date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return <span style={{ color: 'var(--amber)', fontFamily: 'var(--mono)', fontSize: '11px' }}>{value}</span>
    }
    return <span style={{ color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: '12px' }}>{value}</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>[]</span>
    }
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--accent2)',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            padding: '0',
          }}
        >
          {open ? '▾' : '▸'} [{value.length}]
        </button>
        {open && (
          <div style={{ paddingLeft: '16px', borderLeft: '1px solid var(--border)', marginLeft: '4px', marginTop: '4px' }}>
            {value.map((item, i) => (
              <div key={i} style={{ marginBottom: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '10px', minWidth: '20px', paddingTop: '2px' }}>{i}</span>
                <ValueNode value={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) {
      return <span style={{ color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px' }}>{'{}'}</span>
    }

    // Monetary amount — render inline
    const obj = value as Record<string, unknown>
    if (typeof obj.amount === 'string' && typeof obj.currency === 'string') {
      return (
        <span style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>
          <span style={{ color: 'var(--teal2)' }}>{obj.amount}</span>
          <span style={{ color: 'var(--text3)' }}> </span>
          <span style={{ color: 'var(--amber)' }}>{obj.currency}</span>
        </span>
      )
    }

    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text2)',
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            padding: '0',
          }}
        >
          {open ? '▾' : '▸'} {'{'}…{'}'}
        </button>
        {open && (
          <div style={{ paddingLeft: '16px', borderLeft: '1px solid var(--border)', marginLeft: '4px', marginTop: '4px' }}>
            {entries.map(([k, v]) => (
              <div key={k} style={{ marginBottom: '5px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: 'var(--text3)',
                  minWidth: '120px',
                  flexShrink: 0,
                  paddingTop: '1px',
                }}>{k}</span>
                <ValueNode value={v} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return <span style={{ color: 'var(--text)', fontSize: '12px' }}>{String(value)}</span>
}

export default function DataTree({ data }: Props) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '14px 16px',
    }}>
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '1.5px',
        color: 'var(--text3)',
        textTransform: 'uppercase',
        marginBottom: '12px',
      }}>data.json</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="data-tree-row" style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            padding: '4px 0',
            borderBottom: '1px solid var(--border)',
          }}>
            <span className="data-tree-key" style={{
              fontFamily: 'var(--mono)',
              fontSize: '11px',
              color: 'var(--accent2)',
              minWidth: '140px',
              flexShrink: 0,
              paddingTop: '1px',
            }}>{key}</span>
            <ValueNode value={value} depth={0} />
          </div>
        ))}
      </div>
    </div>
  )
}
