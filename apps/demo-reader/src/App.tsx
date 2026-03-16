import { useState, useCallback } from 'react'
import { parseSDF } from '@etapsky/sdf-kit/reader'
import { SDFError } from '@etapsky/sdf-kit'
import type { AppState, SDFParseResult } from './types'
import DropZone from './components/DropZone'
import Header from './components/Header'
import PDFViewer from './components/PDFViewer'
import MetaCard from './components/MetaCard'
import DataTree from './components/DataTree'

type Panel = 'data' | 'schema' | 'raw'

export default function App() {
  const [state, setState] = useState<AppState>({ status: 'idle' })
  const [activePanel, setActivePanel] = useState<Panel>('data')

  const handleFile = useCallback(async (file: File) => {
    setState({ status: 'loading' })
    try {
      const buffer = await file.arrayBuffer()
      const result = await parseSDF(Buffer.from(buffer)) as SDFParseResult
      setState({ status: 'ready', result, filename: file.name })
    } catch (err) {
      if (err instanceof SDFError) {
        setState({ status: 'error', message: err.message, code: err.code })
      } else {
        setState({ status: 'error', message: String(err) })
      }
    }
  }, [])

  const reset = useCallback(() => {
    setState({ status: 'idle' })
    setActivePanel('data')
  }, [])

  // ─── Idle / Loading / Error ──────────────────────────────────────────────────

  if (state.status === 'idle') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <DropZone onFile={handleFile} />
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text3)' }}>
          parsing .sdf…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '20px',
        padding: '40px',
      }}>
        <div style={{
          background: 'rgba(216,90,48,0.08)',
          border: '1px solid rgba(216,90,48,0.25)',
          borderRadius: '10px',
          padding: '24px 32px',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--mono)',
            fontSize: '11px',
            color: 'var(--coral)',
            letterSpacing: '1px',
            marginBottom: '8px',
          }}>{state.code ?? 'ERROR'}</div>
          <div style={{
            fontFamily: 'var(--sans)',
            fontSize: '14px',
            color: 'var(--text)',
            lineHeight: 1.6,
          }}>{state.message}</div>
        </div>
        <button
          onClick={reset}
          style={{
            background: 'none',
            border: '1px solid var(--border2)',
            borderRadius: '6px',
            color: 'var(--text2)',
            fontFamily: 'var(--mono)',
            fontSize: '12px',
            padding: '8px 20px',
            cursor: 'pointer',
          }}
        >
          try another file
        </button>
      </div>
    )
  }

  // ─── Ready ───────────────────────────────────────────────────────────────────

  const { result, filename } = state

  const panelTabs: { id: Panel; label: string }[] = [
    { id: 'data',   label: 'data.json' },
    { id: 'schema', label: 'schema.json' },
    { id: 'raw',    label: 'meta.json' },
  ]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      <Header filename={filename} meta={result.meta} onReset={reset} />

      {/* Main layout */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '1px',
        background: 'var(--border)',
        overflow: 'hidden',
      }}>

        {/* Left — PDF viewer */}
        <div style={{
          background: 'var(--bg)',
          overflow: 'hidden',
          padding: '16px',
        }}>
          <PDFViewer pdfBytes={result.pdfBytes} />
        </div>

        {/* Right — Data panels */}
        <div style={{
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>

          {/* Tab bar */}
          <div style={{
            display: 'flex',
            gap: '0',
            background: 'var(--bg2)',
            borderBottom: '1px solid var(--border)',
            padding: '0 16px',
            flexShrink: 0,
          }}>
            {panelTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: `2px solid ${activePanel === tab.id ? 'var(--accent)' : 'transparent'}`,
                  color: activePanel === tab.id ? 'var(--text)' : 'var(--text3)',
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  padding: '12px 14px 10px',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {activePanel === 'data' && (
              <>
                <MetaCard meta={result.meta} />
                <DataTree data={result.data} />
              </>
            )}

            {activePanel === 'schema' && (
              <SchemaPanel schema={result.schema} />
            )}

            {activePanel === 'raw' && (
              <RawPanel data={result.meta as unknown as Record<string, unknown>} label="meta.json" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Schema panel ─────────────────────────────────────────────────────────────

function SchemaPanel({ schema }: { schema: Record<string, unknown> }) {
  const required = (schema.required as string[] | undefined) ?? []
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined

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
      }}>schema.json</div>

      {(schema.$id || schema.title) && (
        <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
          {schema.title && (
            <div style={{ fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
              {schema.title as string}
            </div>
          )}
          {schema.$id && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)', wordBreak: 'break-all' }}>
              {schema.$id as string}
            </div>
          )}
        </div>
      )}

      {properties && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {Object.entries(properties).map(([key, def]) => {
            const isRequired = required.includes(key)
            const type = (def.type as string) ?? '—'
            return (
              <div key={key} style={{
                display: 'grid',
                gridTemplateColumns: '140px 80px 1fr',
                gap: '8px',
                padding: '4px 0',
                borderBottom: '1px solid var(--border)',
                alignItems: 'center',
              }}>
                <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '11px',
                  color: isRequired ? 'var(--accent2)' : 'var(--text2)',
                }}>{key}{isRequired && <span style={{ color: 'var(--coral)' }}> *</span>}</span>
                <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: '10px',
                  color: 'var(--amber)',
                }}>{type}</span>
                <span style={{
                  fontFamily: 'var(--sans)',
                  fontSize: '11px',
                  color: 'var(--text3)',
                }}>{def.description as string ?? (def.const ? `= "${def.const}"` : '')}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Raw JSON panel ───────────────────────────────────────────────────────────

function RawPanel({ data, label }: { data: Record<string, unknown>; label: string }) {
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
      }}>{label}</div>
      <pre style={{
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        color: 'var(--text2)',
        lineHeight: '1.7',
        overflowX: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}