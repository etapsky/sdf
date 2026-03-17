interface Props {
  open:      boolean;
  onToggle:  () => void;
  label?:    string;
}

export default function FormToggle({ open, onToggle, label = 'Form' }: Props) {
  return (
    <button
      onClick={onToggle}
      aria-label={open ? 'Close form' : 'Open form'}
      style={{
        display:       'flex',
        alignItems:    'center',
        gap:           '6px',
        padding:       '6px 10px',
        background:    open ? 'var(--accent)' : 'var(--bg2)',
        border:        `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius:  '6px',
        color:         open ? 'white' : 'var(--text3)',
        fontFamily:    'var(--mono)',
        fontSize:      '10px',
        cursor:        'pointer',
        transition:    'border-color 0.15s, color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        if (!open) {
          e.currentTarget.style.borderColor = 'var(--border2)'
          e.currentTarget.style.color = 'var(--text2)'
        }
      }}
      onMouseLeave={e => {
        if (!open) {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--text3)'
        }
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
      <span>{label}</span>
    </button>
  )
}
