import type { GenerateState } from '../types'

interface Props {
  genState:  GenerateState;
  onGenerate: () => void | Promise<void>;
}

export default function GenerateButton({ genState, onGenerate }: Props) {
  const isGenerating = genState.status === 'generating'

  return (
    <div style={{ marginTop: '32px' }}>
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        style={{
          width:        '100%',
          background:   isGenerating ? 'var(--text3)' : 'var(--accent)',
          border:       'none',
          borderRadius: '8px',
          color:        'white',
          fontFamily:   'var(--sans)',
          fontSize:     '14px',
          fontWeight:   500,
          padding:      '12px',
          cursor:       isGenerating ? 'not-allowed' : 'pointer',
          transition:   'background 0.15s',
          letterSpacing: '-0.2px',
        }}
      >
        {isGenerating ? 'Generating…' : '↓  Generate .sdf file'}
      </button>

      {/* Status messages */}
      {genState.status === 'done' && (
        <div style={{
          marginTop:    '12px',
          padding:      '10px 14px',
          background:   'rgba(15,110,86,0.08)',
          border:       '1px solid rgba(15,110,86,0.2)',
          borderRadius: '6px',
          fontFamily:   'var(--mono)',
          fontSize:     '11px',
          color:        'var(--teal)',
        }}>
          ✓ {genState.filename} downloaded
        </div>
      )}

      {genState.status === 'error' && (
        <div style={{
          marginTop:    '12px',
          padding:      '10px 14px',
          background:   'rgba(153,60,29,0.08)',
          border:       '1px solid rgba(153,60,29,0.2)',
          borderRadius: '6px',
          fontFamily:   'var(--mono)',
          fontSize:     '11px',
          color:        'var(--coral)',
        }}>
          ✗ {genState.message}
        </div>
      )}

      {/* Hint */}
      <div style={{
        marginTop:  '16px',
        fontFamily: 'var(--sans)',
        fontSize:   '11px',
        color:      'var(--text3)',
        lineHeight: 1.6,
      }}>
        The generated file is a ZIP archive containing <code style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>visual.pdf</code>, <code style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>data.json</code>, <code style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>schema.json</code>, and <code style={{ fontFamily: 'var(--mono)', fontSize: '10px' }}>meta.json</code>. Open it in <a href="/demo-reader" style={{ color: 'var(--accent2)', textDecoration: 'none' }}>SDF Reader</a> to inspect all layers.
      </div>
    </div>
  )
}
