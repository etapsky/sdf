import { useState, useMemo, useCallback, useEffect } from 'react'
import { buildSDF } from '@etapsky/sdf-kit/producer'
import type { GenerateState, DocTypeConfig } from './types'
import { invoiceConfig }    from './schemas/invoice'
import { nominationConfig } from './schemas/nomination'
import DocTypeSelector from './components/DocTypeSelector'
import FormRenderer    from './components/FormRenderer'
import GenerateButton  from './components/GenerateButton'
import JsonPreview     from './components/JsonPreview'
import ThemeToggle     from './components/ThemeToggle'

const CONFIGS: DocTypeConfig[] = [invoiceConfig, nominationConfig]
const THEME_KEY = 'sdf-producer-theme'

type Theme = 'dark' | 'light'

export default function App() {
  const [docTypeId, setDocTypeId]   = useState<string>('invoice')
  const [values, setValues]         = useState<Record<string, string>>({})
  const [genState, setGenState]     = useState<GenerateState>({ status: 'idle' })
  const [theme, setTheme]           = useState<Theme>(() =>
    (localStorage.getItem(THEME_KEY) as Theme) ?? 'light'
  )

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
        documentType: config.id,
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
      <div style={{
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
      }}>
        <a href="https://etapsky.com" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
          <img src={`${import.meta.env.BASE_URL}etapsky_mark.svg`} alt="Etapsky Inc." width="24" height="24" style={{ verticalAlign: 'middle' }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text3)', fontWeight: 500 }}>Etapsky Inc.</span>
        </a>
        <div style={{ width: '1px', height: '16px', background: 'var(--border2)' }} />
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize:   '14px',
          fontWeight: 500,
          color:      'var(--text)',
          letterSpacing: '-0.3px',
        }}>SDF <span style={{ color: 'var(--text3)' }}>producer</span></span>
        <div style={{ width: '1px', height: '16px', background: 'var(--border2)' }} />
        <span style={{
          fontFamily: 'var(--sans)',
          fontSize:   '12px',
          color:      'var(--text2)',
          fontWeight: 300,
        }}>Fill in the form — generate a Smart Document Format file</span>

        <div style={{ flex: 1 }} />

        <ThemeToggle theme={theme} onToggle={toggleTheme} />

        <a href="https://github.com/etapsky" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center' }}>
          <img src="https://img.shields.io/badge/GitHub-Etapsky-181717?style=flat-square&logo=github" alt="github.com/etapsky" style={{ verticalAlign: 'middle', height: 20 }} />
        </a>
      </div>

      {/* Main */}
      <div style={{
        flex:    1,
        display: 'grid',
        gridTemplateColumns: '420px 1fr',
        minHeight: 0,
      }}>

        {/* Left — Form */}
        <div style={{
          borderRight: '1px solid var(--border)',
          overflowY:   'auto',
          padding:     '32px',
          background:  'var(--bg)',
        }}>

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

          {/* Form */}
          <FormRenderer
            fields={config.fields}
            values={values}
            onChange={handleFieldChange}
          />

          {/* Generate button */}
          <GenerateButton genState={genState} onGenerate={handleGenerate} />
        </div>

        {/* Right — Live JSON preview */}
        <div style={{
          display:  'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          height:   'calc(100vh - 52px)',
          position: 'sticky',
          top:      '52px',
        }}>
          <JsonPreview data={previewData} />
        </div>

      </div>
    </div>
  )
}