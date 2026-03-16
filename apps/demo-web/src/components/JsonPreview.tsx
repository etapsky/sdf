interface Props {
    data: Record<string, unknown>;
  }
  
  function colorize(json: string): string {
    return json
      .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
        let cls = 'color: var(--teal);' // number
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'color: var(--accent);' // key
          } else {
            cls = 'color: var(--text);' // string value
          }
        } else if (/true|false/.test(match)) {
          cls = 'color: var(--amber);'
        } else if (/null/.test(match)) {
          cls = 'color: var(--text3);'
        }
        return `<span style="${cls}">${match}</span>`
      })
  }
  
  export default function JsonPreview({ data }: Props) {
    const json = JSON.stringify(data, null, 2)
    const colored = colorize(json)
  
    return (
      <div style={{
        height:     '100%',
        display:    'flex',
        flexDirection: 'column',
        overflow:   'hidden',
      }}>
        {/* Header */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '12px 16px',
          borderBottom:   '1px solid var(--border)',
          background:     'var(--bg2)',
          flexShrink:     0,
        }}>
          <span style={{
            fontFamily:    'var(--mono)',
            fontSize:      '10px',
            fontWeight:    500,
            letterSpacing: '1.5px',
            color:         'var(--text3)',
            textTransform: 'uppercase',
          }}>data.json — live preview</span>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize:   '10px',
            color:      'var(--text3)',
          }}>{json.split('\n').length} lines</span>
        </div>
  
        {/* Code */}
        <div style={{
          flex:       1,
          overflowY:  'auto',
          padding:    '16px',
          background: 'white',
        }}>
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
        </div>
      </div>
    )
  }