import type { SDFMeta } from '../types'
import ThemeToggle from './ThemeToggle'

interface Props {
  filename:      string;
  meta:          SDFMeta;
  pdfBytes:      Uint8Array;
  onReset:       () => void;
  theme:         'dark' | 'light';
  onToggleTheme: () => void;
  isPlainPDF:    boolean;
}

const DownloadIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const btnStyle: React.CSSProperties = {
  background: 'none', border: '1px solid var(--border)', borderRadius: '6px',
  color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '11px',
  padding: '4px 12px', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s',
  display: 'flex', alignItems: 'center', gap: '5px',
}

export default function Header({ filename, meta, pdfBytes, onReset, theme, onToggleTheme, isPlainPDF }: Props) {

  // SDF açıksa → PDF indir
  const downloadPDF = () => {
    const name = filename.replace('.sdf', '.pdf')
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  // PDF açıksa → SDF olarak wrap edip indir
  const saveAsSDF = async () => {
    const { default: JSZip } = await import('jszip')
    const data = {
      document_type: 'wrapped_pdf',
      source:        'wrapped_from_pdf',
      original_file: filename,
      note:          'Wrapped from plain PDF via SDF Reader.',
    }
    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'Wrapped PDF', type: 'object',
      properties: {
        document_type: { type: 'string' }, source: { type: 'string' },
        original_file: { type: 'string' }, note:   { type: 'string' },
      },
    }
    const meta = {
      sdf_version: '0.1', document_id: globalThis.crypto.randomUUID(),
      issuer: 'SDF Reader', created_at: new Date().toISOString(),
      document_type: 'wrapped_pdf', signature_algorithm: null,
    }
    const zip = new JSZip()
    zip.file('visual.pdf',  pdfBytes,                      { binary: true })
    zip.file('data.json',   JSON.stringify(data,   null, 2))
    zip.file('schema.json', JSON.stringify(schema, null, 2))
    zip.file('meta.json',   JSON.stringify(meta,   null, 2))
    const buffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
    const name   = filename.replace('.pdf', '.sdf')
    const blob   = new Blob([buffer], { type: 'application/vnd.sdf' })
    const url    = URL.createObjectURL(blob)
    const a      = document.createElement('a')
    a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      height: '48px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', padding: '0 20px', gap: '16px', flexShrink: 0,
    }}>

      <span style={{ fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: 500, color: 'var(--text)', letterSpacing: '-0.3px' }}>
        SDF <span style={{ color: 'var(--text3)' }}>reader</span>
      </span>

      <div style={{ width: '1px', height: '16px', background: 'var(--border2)' }} />

      <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--accent2)' }}>
        {filename}
      </span>

      {/* Badges */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {meta.document_type && meta.document_type !== 'plain_pdf' && (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--teal)',
            background: 'rgba(93,202,165,0.12)', border: '1px solid rgba(93,202,165,0.25)',
            borderRadius: '4px', padding: '2px 8px',
          }}>{meta.document_type}</span>
        )}
        {isPlainPDF ? (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--amber)',
            background: 'rgba(239,159,39,0.12)', border: '1px solid rgba(239,159,39,0.25)',
            borderRadius: '4px', padding: '2px 8px',
          }}>plain pdf</span>
        ) : (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text3)',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: '4px', padding: '2px 8px',
          }}>v{meta.sdf_version}</span>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Valid badge — SDF only */}
      {!isPlainPDF && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--teal)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            valid
          </div>
          <div style={{ width: '1px', height: '16px', background: 'var(--border2)' }} />
        </>
      )}

      {/* Download button — context-aware */}
      {isPlainPDF ? (
        <button
          onClick={saveAsSDF}
          style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text3)' }}
        >
          <DownloadIcon /> sdf
        </button>
      ) : (
        <button
          onClick={downloadPDF}
          style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text3)' }}
        >
          <DownloadIcon /> pdf
        </button>
      )}

      <div style={{ width: '1px', height: '16px', background: 'var(--border2)' }} />
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <div style={{ width: '1px', height: '16px', background: 'var(--border2)' }} />

      <button
        onClick={onReset}
        style={btnStyle}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text3)' }}
      >
        open another
      </button>
    </div>
  )
}