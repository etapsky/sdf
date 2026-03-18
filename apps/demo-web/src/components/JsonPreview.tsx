// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useState } from 'react'

interface Props {
  data:   Record<string, unknown>;
  schema: Record<string, unknown>;
  meta:   Record<string, unknown>;
}

const TABS = [
  { id: 'data',   label: 'data.json' },
  { id: 'schema', label: 'schema.json' },
  { id: 'meta',   label: 'meta.json' },
] as const

function colorize(json: string): string {
  return json
    .replace(/("(\u[a-zA-Z0-9]{4}|\[^u]|[^\"])*"(\s*:)?|(true|false|null)|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'color: var(--teal);'
      if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'color: var(--accent);'
        } else {
          cls = 'color: var(--text);'
        }
      } else if (/true|false/.test(match)) {
        cls = 'color: var(--amber);'
      } else if (/null/.test(match)) {
        cls = 'color: var(--text3);'
      }
      return `<span style="${cls}">${match}</span>`
    })
}

function JsonBlock({ obj }: { obj: Record<string, unknown> }) {
  const json = JSON.stringify(obj, null, 2)
  const colored = colorize(json)

  return (
    <pre
      style={{
        fontFamily:  'var(--mono)',
        fontSize:    '11.5px',
        lineHeight:  '1.7',
        color:       'var(--text)',
        whiteSpace:  'pre-wrap',
        wordBreak:   'break-word',
        margin:      0,
      }}
      dangerouslySetInnerHTML={{ __html: colored }}
    />
  )
}

export default function JsonPreview({ data, schema, meta }: Props) {
  const [activeTab, setActiveTab] = useState<'data' | 'schema' | 'meta'>('data')

  const activeContent = activeTab === 'data' ? data : activeTab === 'schema' ? schema : meta
  const lineCount = JSON.stringify(activeContent, null, 2).split('
').length

  return (
    <div style={{
      height:     '100%',
      display:    'flex',
      flexDirection: 'column',
      overflow:   'hidden',
    }}>
      {/* Tabs */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        gap:            '4px',
        padding:        '8px 16px 0',
        borderBottom:   '1px solid var(--border)',
        background:     'var(--bg2)',
        flexShrink:     0,
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding:       '10px 14px',
              fontFamily:    'var(--mono)',
              fontSize:      '11px',
              fontWeight:    500,
              letterSpacing: '0.5px',
              color:         activeTab === tab.id ? 'var(--accent)' : 'var(--text3)',
              background:    'none',
              border:        'none',
              borderBottom:  `2px solid ${activeTab === tab.id ? 'var(--accent)' : 'transparent'}`,
              cursor:        'pointer',
              marginBottom:  '-1px',
              transition:    'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
        <span style={{
          marginLeft:   'auto',
          fontFamily:   'var(--mono)',
          fontSize:     '10px',
          color:        'var(--text3)',
        }}>
          {lineCount} lines
        </span>
      </div>

      {/* Code */}
      <div style={{
        flex:       1,
        overflowY:  'auto',
        padding:    '16px',
        background: 'var(--bg3)',
      }}>
        <JsonBlock obj={activeContent as Record<string, unknown>} />
      </div>
    </div>
  )
}
