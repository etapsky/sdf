import { useState, useCallback, useEffect } from 'react'
import { parseSDF } from '@etapsky/sdf-kit/reader'
import { SDFError } from '@etapsky/sdf-kit'
import type { AppState, SDFParseResult } from './types'
import DropZone from './components/DropZone'
import Header from './components/Header'
import PDFViewer from './components/PDFViewer'
import MetaCard from './components/MetaCard'
import DataTree from './components/DataTree'
import ThemeToggle from './components/ThemeToggle'

type Panel = 'data' | 'schema' | 'raw'
type Theme = 'dark' | 'light'

const THEME_KEY = 'sdf-reader-theme'

export default function App() {
  const [state, setState] = useState<AppState>({ status: 'idle' })
  const [activePanel, setActivePanel] = useState<Panel>('data')
  const [theme, setTheme] = useState<Theme>(() =>
    (localStorage.getItem(THEME_KEY) as Theme) ?? 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])

  const handleFile = useCallback(async (file: File) => {
    setState({ status: 'loading' })

    // ── Plain PDF — visual-only mode ──────────────────────────────────────
    if (file.name.endsWith('.pdf')) {
      const buffer = await file.arrayBuffer()
      const pdfBytes = new Uint8Array(buffer)
      const plainResult: SDFParseResult = {
        meta: {
          sdf_version: '—',
          document_id: '—',
          issuer:      '—',
          created_at:  '—',
          document_type: 'plain_pdf',
        },
        data: {
          _notice: 'This is a plain PDF file — no structured data layer.',
          _filename: file.name,
          _size_kb: (buffer.byteLength / 1024).toFixed(1) + ' KB',
          _hint: 'To add structured data, use: sdf wrap document.pdf --issuer "..." --out document.sdf',
        },
        schema: {},
        pdfBytes,
      }
      setState({ status: 'ready', result: plainResult, filename: file.name })
      return
    }

    // ── SDF file — full parse ─────────────────────────────────────────────
    try {
      const buffer = await file.arrayBuffer()
      const result = await parseSDF(new Uint8Array(buffer)) as SDFParseResult
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

  // ─── Idle ────────────────────────────────────────────────────────────────────

  if (state.status === 'idle') {
    return (
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10 }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <DropZone onFile={handleFile} />
      </div>
    )
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (state.status === 'loading') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10 }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div style={{
          width: '32px', height: '32px',
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text3)' }}>
          parsing…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ─── Error ───────────────────────────────────────────────────────────────────

  if (state.status === 'error') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px', padding: '40px' }}>
        <div style={{ position: 'fixed', top: 12, right: 12, zIndex: 10 }}>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
        <div style={{
          background: 'rgba(216,90,48,0.08)',
          border: '1px solid rgba(216,90,48,0.25)',
          borderRadius: '10px',
          padding: '24px 32px',
          maxWidth: '520px',
          width: '100%',
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--coral)', letterSpacing: '1px', marginBottom: '8px' }}>
            {state.code ?? 'ERROR'}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '14px', color: 'var(--text)', lineHeight: 1.6 }}>
            {state.message}
          </div>
        </div>
        <button onClick={reset} style={{ background: 'none', border: '1px solid var(--border2)', borderRadius: '6px', color: 'var(--text2)', fontFamily: 'var(--mono)', fontSize: '12px', padding: '8px 20px', cursor: 'pointer' }}>
          try another file
        </button>
      </div>
    )
  }

  // ─── Ready ───────────────────────────────────────────────────────────────────

  const { result, filename } = state
  const isPlainPDF = filename.endsWith('.pdf')

  const panelTabs: { id: Panel; label: string }[] = [
    { id: 'data',   label: isPlainPDF ? 'info' : 'data.json' },
    { id: 'schema', label: 'schema.json' },
    { id: 'raw',    label: 'meta.json' },
  ]

  return (
    <div className="reader-app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Header filename={filename} meta={result.meta} pdfBytes={result.pdfBytes} onReset={reset} theme={theme} onToggleTheme={toggleTheme} isPlainPDF={isPlainPDF} />

      <div
        className="reader-main"
        style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border)', overflow: 'hidden' }}
      >

        {/* Left — PDF viewer */}
        <div className="reader-pdf-section" style={{ background: 'var(--bg)', overflow: 'auto', padding: '16px' }}>
          <PDFViewer pdfBytes={result.pdfBytes} />
        </div>

        {/* Right — Data panels */}
        <div className="reader-data-section" style={{ background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

          {/* Tab bar */}
          <div className="reader-tabs" style={{ display: 'flex', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0 16px', flexShrink: 0 }}>
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
          <div className="reader-panel-content" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {activePanel === 'data' && (
              <>
                {isPlainPDF ? (
                  <PlainPDFNotice filename={filename} />
                ) : (
                  <>
                    <MetaCard meta={result.meta} />
                    <DataTree data={result.data} />
                  </>
                )}
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

// ─── Plain PDF notice ─────────────────────────────────────────────────────────

function PlainPDFNotice({ filename }: { filename: string }) {
  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '24px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', fontWeight: 500, color: 'var(--amber)', letterSpacing: '0.5px' }}>
          PLAIN PDF — NO STRUCTURED DATA
        </span>
      </div>

      <div style={{ fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--text)', lineHeight: 1.7, marginBottom: '20px' }}>
        <strong>{filename}</strong> is a plain PDF file. It does not contain a structured
        data layer (<code style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>data.json</code>,{' '}
        <code style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>schema.json</code>,{' '}
        <code style={{ fontFamily: 'var(--mono)', fontSize: '11px' }}>meta.json</code>).
        The visual layer is displayed on the left.
      </div>

      <div style={{
        background: 'var(--bg3)',
        border: '1px solid var(--border)',
        borderRadius: '6px',
        padding: '14px 16px',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)', marginBottom: '8px', letterSpacing: '1px' }}>
          TO ADD STRUCTURED DATA
        </div>
        <code style={{
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          color: 'var(--teal)',
          lineHeight: 1.8,
          display: 'block',
        }}>
          sdf wrap {filename} \<br />
          &nbsp;&nbsp;--issuer "Your Organization" \<br />
          &nbsp;&nbsp;--out {filename.replace('.pdf', '.sdf')}
        </code>
      </div>
    </div>
  )
}

// ─── Schema panel ─────────────────────────────────────────────────────────────

function SchemaPanel({ schema }: { schema: Record<string, unknown> }) {
  const required   = (schema.required as string[] | undefined) ?? []
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined

  if (!properties) {
    return (
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>schema.json</div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: '12px', color: 'var(--text3)', marginTop: '12px' }}>No schema defined.</div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '12px' }}>schema.json</div>

      {Boolean(schema.$id || schema.title) && (
        <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
          {schema.title != null && <div style={{ fontFamily: 'var(--sans)', fontSize: '13px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>{String(schema.title)}</div>}
          {schema.$id != null && <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)', wordBreak: 'break-all' }}>{String(schema.$id)}</div>}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {Object.entries(properties).map(([key, def]) => {
          const isRequired = required.includes(key)
          return (
            <div key={key} className="schema-panel-row" style={{ display: 'grid', gridTemplateColumns: '140px 80px 1fr', gap: '8px', padding: '4px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: isRequired ? 'var(--accent2)' : 'var(--text2)' }}>
                {key}{isRequired && <span style={{ color: 'var(--coral)' }}> *</span>}
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--amber)' }}>{(def.type as string) ?? '—'}</span>
              <span style={{ fontFamily: 'var(--sans)', fontSize: '11px', color: 'var(--text3)' }}>
                {def.description as string ?? (def.const ? `= "${def.const}"` : '')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Raw JSON panel ───────────────────────────────────────────────────────────

function RawPanel({ data, label }: { data: Record<string, unknown>; label: string }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '14px 16px' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', fontWeight: 500, letterSpacing: '1.5px', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: '12px' }}>{label}</div>
      <pre style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text2)', lineHeight: '1.7', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}