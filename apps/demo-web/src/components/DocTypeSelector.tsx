import type { DocTypeConfig } from '../types'

interface Props {
  configs:  DocTypeConfig[];
  selected: string;
  onChange: (id: string) => void;
}

const scenarioColor: Record<string, string> = {
  'B2B': 'var(--teal)',
  'B2G': 'var(--coral)',
  'G2G': 'var(--amber)',
}

export default function DocTypeSelector({ configs, selected, onChange }: Props) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      flexWrap: 'wrap',
      marginBottom: '24px',
    }}>
      {configs.map(cfg => {
        const active = cfg.id === selected
        return (
          <button
            key={cfg.id}
            onClick={() => onChange(cfg.id)}
            style={{
              background:   active ? 'var(--accent)' : 'var(--bg2)',
              border:       `1px solid ${active ? 'var(--accent)' : 'var(--border2)'}`,
              borderRadius: '8px',
              padding:      '10px 16px',
              cursor:       'pointer',
              textAlign:    'left',
              transition:   'all 0.15s',
              minWidth:     '140px',
            }}
          >
            <div style={{
              fontFamily: 'var(--sans)',
              fontSize:   '13px',
              fontWeight: 500,
              color:      active ? 'white' : 'var(--text)',
              marginBottom: '2px',
            }}>{cfg.label}</div>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize:   '10px',
              color: active
                ? 'rgba(255,255,255,0.7)'
                : scenarioColor[cfg.scenario] ?? 'var(--text3)',
            }}>{cfg.scenario}</div>
          </button>
        )
      })}
    </div>
  )
}