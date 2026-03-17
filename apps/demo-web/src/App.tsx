import { useState, useMemo, useCallback, useEffect } from 'react'
import { buildSDF } from '@etapsky/sdf-kit/producer'
import type { GenerateState, DocTypeConfig } from './types'
import { invoiceConfig }    from './schemas/invoice'
import { nominationConfig } from './schemas/nomination'
import { purchaseOrderConfig } from './schemas/purchase-order'
import { govTaxDeclarationConfig } from './schemas/gov-tax-declaration'
import { govCustomsDeclarationConfig } from './schemas/gov-customs-declaration'
import { govHealthReportConfig } from './schemas/gov-health-report'
import { govPermitApplicationConfig } from './schemas/gov-permit-application'
import DocTypeSelector from './components/DocTypeSelector'
import FormRenderer    from './components/FormRenderer'
import FormToggle     from './components/FormToggle'
import GenerateButton  from './components/GenerateButton'
import JsonPreview     from './components/JsonPreview'
import ThemeToggle     from './components/ThemeToggle'

const CONFIGS: DocTypeConfig[] = [
  nominationConfig,
  purchaseOrderConfig,
  invoiceConfig,
  govTaxDeclarationConfig,
  govCustomsDeclarationConfig,
  govHealthReportConfig,
  govPermitApplicationConfig,
]
const THEME_KEY = 'sdf-producer-theme'

type Theme = 'dark' | 'light'

export default function App() {
  const [docTypeId, setDocTypeId]   = useState<string>('purchase-order')
  const [values, setValues]         = useState<Record<string, string>>({})
  const [genState, setGenState]     = useState<GenerateState>({ status: 'idle' })
  const [theme, setTheme]           = useState<Theme>(() =>
    (localStorage.getItem(THEME_KEY) as Theme) ?? 'light'
  )
  const [formOpen, setFormOpen] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches) {
      setFormOpen(false)
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])

  const config = CONFIGS.find(c => c.id === docTypeId)!

  // Reset form values when doc type changes
  const handleDocTypeChange = useCallback((id: string) => {
    setDocTypeId(id)
    setValues({})
    setGenState({ status: 'idle' })
  }, [])

  const handleFieldChange = useCallback((key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }))
  }, [])

  // Build live preview data
  const previewData = useMemo(() => {
    try { return config.buildData(values) } catch { return {} }
  }, [config, values])

  // Meta preview (actual meta is built at generate time)
  const previewMeta = useMemo(() => ({
    sdf_version:         '0.1',
    document_id:         '(generated on build)',
    document_type:       config.documentType ?? config.id,
    issuer:              config.issuer,
    issuer_id:           config.issuerId,
    recipient:           config.recipient,
    recipient_id:        config.recipientId,
    schema_id:           config.schemaId,
    created_at:          new Date().toISOString(),
    signature_algorithm: null,
  }), [config])

  // Generate .sdf
  const handleGenerate = async () => {
    setGenState({ status: 'generating' })
    try {
      const data = config.buildData(values)
      const buffer = await buildSDF({
        data,
        schema:       config.schema,
        issuer:       config.issuer,
        issuerId:     config.issuerId,
        documentType: config.documentType ?? config.id,
        recipient:    config.recipient,
        recipientId:  config.recipientId,
        schemaId:     config.schemaId,
      })

      // Download
      const filename = `${config.id}-${new Date().toISOString().slice(0, 10)}.sdf`
      const blob = new Blob([new Uint8Array(buffer)], { type: 'application/vnd.sdf' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      setGenState({ status: 'done', filename })
    } catch (err) {
      setGenState({ status: 'error', message: String(err) })
    }
  }

  return (
    <div style={{
      minHeight:  '100vh',
      display:    'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <header
        className="app-header"
        style={{
          background:   'var(--bg2)',
          borderBottom: '1px solid var(--border)',
          padding:      '0 32px',
          height:       '52px',
          display:      'flex',
          alignItems:   'center',
          gap:          '12px',
          position:     'sticky',
          top:          0,
          zIndex:       10,
        }}
      >
        <div className="app-header-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <a href="https://etapsky.com" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
            <img src={`${import.meta.env.BASE_URL}etapsky_mark.svg`} alt="Etapsky Inc." width="24" height="24" style={{ verticalAlign: 'middle' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>Etapsky Inc.</span>
          </a>
          <span style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--border2)', fontWeight: 400 }}>|</span>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize:   '14px',
            fontWeight: 500,
            color:      'var(--text)',
            letterSpacing: '-0.3px',
          }}>SDF <span style={{ color: 'var(--text3)' }}>producer</span></span>
        </div>
        <div className="app-header-divider" style={{ width: '1px', height: '16px', background: 'var(--border2)', flexShrink: 0 }} />
        <span className="app-header-subtitle" style={{
          fontFamily: 'var(--sans)',
          fontSize:   '12px',
          color:      'var(--text2)',
          fontWeight: 300,
        }}>Fill in the form — generate a Smart Document Format file</span>

        <div className="app-header-spacer" style={{ flex: 1 }} />

        <div className="app-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <FormToggle open={formOpen} onToggle={() => setFormOpen(v => !v)} />
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
          <a href="https://github.com/etapsky" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center' }}>
            <img src="https://img.shields.io/badge/GitHub-Etapsky-181717?style=flat-square&logo=github" alt="github.com/etapsky" style={{ verticalAlign: 'middle', height: 20 }} />
          </a>
        </div>
      </header>

      {/* Main */}
      <div
        className="app-main"
        style={{
          flex:    1,
          display: 'grid',
          gridTemplateColumns: formOpen ? '1fr minmax(480px, 580px)' : '1fr',
          minHeight: 0,
          transition: 'grid-template-columns 0.25s ease',
        }}
      >

        {/* Left — JSON preview (main) */}
        <div className="app-main-content" style={{
          display:  'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height:   'calc(100vh - 52px)',
          position: 'sticky',
          top:      '52px',
        }}>
          <JsonPreview
            data={previewData}
            schema={config.schema as Record<string, unknown>}
            meta={previewMeta}
          />
        </div>

        {/* Right — Form panel (sidebar / drawer) */}
        {formOpen && (
            <div className={`form-panel is-open`}>
              {/* Mobile: close button */}
              <div className="form-panel-header">
                <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: 500, color: 'var(--text3)' }}>Form</span>
                <button
                  type="button"
                  className="form-panel-close"
                  onClick={() => setFormOpen(false)}
                  aria-label="Close form"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {/* Doc type selector */}
              <div style={{
                fontFamily:    'var(--mono)',
                fontSize:      '10px',
                fontWeight:    500,
                letterSpacing: '1.5px',
                color:         'var(--text3)',
                textTransform: 'uppercase',
                marginBottom:  '10px',
              }}>Document type</div>

              <DocTypeSelector
                configs={CONFIGS}
                selected={docTypeId}
                onChange={handleDocTypeChange}
              />

              <div style={{
                fontFamily:   'var(--sans)',
                fontSize:     '12px',
                color:        'var(--text2)',
                marginBottom: '24px',
                fontWeight:   300,
                lineHeight:   1.6,
              }}>
                {config.description}
              </div>

              <FormRenderer
                fields={config.fields}
                values={values}
                onChange={handleFieldChange}
              />

              <GenerateButton genState={genState} onGenerate={handleGenerate} />
            </div>
        )}

      {/* Mobile drawer overlay */}
      {formOpen && (
        <div
          className="form-drawer-overlay is-visible"
          onClick={() => setFormOpen(false)}
          aria-hidden="true"
        />
      )}
      </div>
    </div>
  )
}