import type { FormField } from '../types'

interface Props {
  fields:   FormField[];
  values:   Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function FormRenderer({ fields, values, onChange }: Props) {
  // Group fields by group label
  const groups: Record<string, FormField[]> = {}
  const ungrouped: FormField[] = []

  for (const field of fields) {
    if (field.group) {
      if (!groups[field.group]) groups[field.group] = []
      groups[field.group].push(field)
    } else {
      ungrouped.push(field)
    }
  }

  const renderField = (field: FormField) => (
    <div
      key={field.key}
      style={{
        marginBottom: '14px',
        gridColumn: field.width === 'half' ? undefined : 'span 2',
      }}
    >
      <label style={{
        display:      'block',
        fontFamily:   'var(--sans)',
        fontSize:     '11px',
        fontWeight:   500,
        color:        'var(--text2)',
        marginBottom: '4px',
        letterSpacing: '0.2px',
      }}>
        {field.label}
        {field.required && (
          <span style={{ color: 'var(--coral)', marginLeft: '3px' }}>*</span>
        )}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          value={values[field.key] ?? ''}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          style={{ resize: 'vertical' }}
        />
      ) : field.type === 'money' ? (
        <input
          type="text"
          inputMode="decimal"
          value={values[field.key] ?? ''}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          style={{ fontFamily: 'var(--mono)' }}
        />
      ) : (
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : 'text'}
          value={values[field.key] ?? ''}
          onChange={e => onChange(field.key, e.target.value)}
          placeholder={field.placeholder}
          min={field.type === 'number' ? '0' : undefined}
          step={field.type === 'number' ? 'any' : undefined}
        />
      )}
    </div>
  )

  return (
    <div>
      {ungrouped.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0 16px',
          marginBottom: '8px',
        }}>
          {ungrouped.map(renderField)}
        </div>
      )}

      {Object.entries(groups).map(([groupName, groupFields]) => (
        <div key={groupName} style={{ marginBottom: '8px' }}>
          <div style={{
            fontFamily:    'var(--mono)',
            fontSize:      '10px',
            fontWeight:    500,
            letterSpacing: '1.5px',
            color:         'var(--text3)',
            textTransform: 'uppercase',
            marginBottom:  '10px',
            paddingBottom: '6px',
            borderBottom:  '1px solid var(--border)',
            marginTop:     '20px',
          }}>
            {groupName}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0 16px',
          }}>
            {groupFields.map(renderField)}
          </div>
        </div>
      ))}
    </div>
  )
}