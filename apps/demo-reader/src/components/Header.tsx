import type { SDFMeta } from '../types'

interface Props {
  filename: string;
  meta: SDFMeta;
  onReset: () => void;
}

export default function Header({ filename, meta, onReset }: Props) {
  return (
    <div style={{
      height: '48px',
      background: 'var(--bg2)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '16px',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--text)',
        letterSpacing: '-0.3px',
      }}>SDF <span style={{ color: 'var(--text3)' }}>reader</span></span>

      <div style={{ width: '1px', height: '16px', background: 'var(--border2)' }} />

      {/* Filename */}
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: '12px',
        color: 'var(--accent2)',
      }}>{filename}</span>

      {/* Badges */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {meta.document_type && (
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            color: 'var(--teal)',
            background: 'rgba(93,202,165,0.12)',
            border: '1px solid rgba(93,202,165,0.25)',
            borderRadius: '4px',
            padding: '2px 8px',
          }}>{meta.document_type}</span>
        )}
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: '10px',
          color: 'var(--text3)',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '2px 8px',
        }}>v{meta.sdf_version}</span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Validation badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--mono)',
        fontSize: '10px',
        color: 'var(--teal)',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        valid
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border2)' }} />

      {/* Reset button */}
      <button
        onClick={onReset}
        style={{
          background: 'none',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          color: 'var(--text3)',
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          padding: '4px 12px',
          cursor: 'pointer',
          transition: 'border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'var(--border2)'
          e.currentTarget.style.color = 'var(--text2)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text3)'
        }}
      >
        open another
      </button>
    </div>
  )
}