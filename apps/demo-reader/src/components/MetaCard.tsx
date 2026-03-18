// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import type { SDFMeta } from '../types'

interface Props {
  meta: SDFMeta;
}

const Row = ({ label, value, mono = false, color }: {
  label: string;
  value: string;
  mono?: boolean;
  color?: string;
}) => (
  <div className="meta-card-row" style={{
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: '8px',
    padding: '5px 0',
    borderBottom: '1px solid var(--border)',
  }}>
    <span style={{
      fontFamily: 'var(--sans)',
      fontSize: '11px',
      color: 'var(--text3)',
      fontWeight: 400,
      paddingTop: '1px',
    }}>{label}</span>
    <span style={{
      fontFamily: mono ? 'var(--mono)' : 'var(--sans)',
      fontSize: mono ? '11px' : '12px',
      color: color ?? 'var(--text)',
      fontWeight: 400,
      wordBreak: 'break-all',
    }}>{value}</span>
  </div>
)

export default function MetaCard({ meta }: Props) {
  const docTypeColor: Record<string, string> = {
    invoice:                  'var(--teal)',
    nomination:               'var(--accent2)',
    purchase_order:           'var(--amber)',
    gov_tax_declaration:      'var(--coral)',
    gov_customs_declaration:  'var(--coral)',
    gov_permit_application:   'var(--coral)',
    gov_health_report:        'var(--coral)',
  }

  const typeColor = meta.document_type
    ? docTypeColor[meta.document_type] ?? 'var(--text2)'
    : 'var(--text2)'

  return (
    <div style={{
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      padding: '14px 16px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: '10px',
          fontWeight: 500,
          letterSpacing: '1.5px',
          color: 'var(--text3)',
          textTransform: 'uppercase',
        }}>meta.json</span>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {meta.document_type && (
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: '10px',
              color: typeColor,
              background: `${typeColor}18`,
              border: `1px solid ${typeColor}40`,
              borderRadius: '4px',
              padding: '2px 8px',
            }}>{meta.document_type}</span>
          )}
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: '10px',
            color: 'var(--accent2)',
            background: 'rgba(127,119,221,0.12)',
            border: '1px solid rgba(127,119,221,0.25)',
            borderRadius: '4px',
            padding: '2px 8px',
          }}>v{meta.sdf_version}</span>
        </div>
      </div>

      {/* Fields */}
      <div>
        <Row label="Document ID" value={meta.document_id} mono />
        <Row label="Issuer" value={meta.issuer + (meta.issuer_id ? ` (${meta.issuer_id})` : '')} />
        {meta.recipient && (
          <Row label="Recipient" value={meta.recipient + (meta.recipient_id ? ` (${meta.recipient_id})` : '')} />
        )}
        <Row label="Created" value={new Date(meta.created_at).toLocaleString()} />
        {meta.schema_id && <Row label="Schema" value={meta.schema_id} mono />}
        {meta.expires_at && (
          <Row
            label="Expires"
            value={new Date(meta.expires_at).toLocaleString()}
            color="var(--amber)"
          />
        )}
        {meta.tags && meta.tags.length > 0 && (
          <Row label="Tags" value={meta.tags.join(', ')} />
        )}
        <Row
          label="Signature"
          value={meta.signature_algorithm ?? 'none (Phase 4)'}
          color="var(--text3)"
          mono
        />
      </div>
    </div>
  )
}
