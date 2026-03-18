// Copyright (c) 2026 Yunus YILDIZ — SPDX-License-Identifier: BUSL-1.1
import { useRef, useState } from 'react'
import type { DragEvent, ChangeEvent } from 'react'

interface Props {
  onFile: (file: File) => void;
}

export default function DropZone({ onFile }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handle = (file: File) => {
    if (!file.name.endsWith('.sdf') && !file.name.endsWith('.pdf')) {
      alert('Please drop a .sdf or .pdf file')
      return
    }
    onFile(file)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handle(file)
  }

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handle(file)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '48px',
      padding: '40px',
    }}>

      {/* Wordmark */}
      <div style={{ textAlign: 'center' }}>
        <a href="https://etapsky.com" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginBottom: '8px', lineHeight: 0 }}>
          <img src={`${import.meta.env.BASE_URL}etapsky_mark.svg`} alt="Etapsky Inc." width="40" height="40" />
        </a>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '3px',
          color: 'var(--text3)',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          Etapsky Inc.
        </div>
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: '28px',
          fontWeight: 500,
          color: 'var(--text)',
          letterSpacing: '-0.5px',
        }}>
          SDF Reader
        </div>
        <div style={{
          fontFamily: 'var(--sans)',
          fontSize: '13px',
          color: 'var(--text2)',
          marginTop: '8px',
          fontWeight: 300,
        }}>
          Smart Document Format — visual + data inspector
        </div>
      </div>

      {/* Drop area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          width: '100%',
          maxWidth: '480px',
          aspectRatio: '16/7',
          border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`,
          borderRadius: '12px',
          background: dragging ? 'rgba(127,119,221,0.06)' : 'var(--bg2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'border-color 0.15s, background 0.15s',
          gap: '16px',
          userSelect: 'none',
        }}
      >
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '10px',
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--sans)', fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
            Drop a .sdf or .pdf file here
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text3)' }}>
            or click to browse
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".sdf,.pdf"
          onChange={onChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Format description */}
      <div style={{ display: 'flex', gap: '32px', opacity: 0.6 }}>
        {[
          { label: 'visual.pdf',  color: 'var(--coral)',   desc: 'Human layer' },
          { label: 'data.json',   color: 'var(--teal)',    desc: 'Machine layer' },
          { label: 'schema.json', color: 'var(--amber)',   desc: 'Validation' },
          { label: 'meta.json',   color: 'var(--accent2)', desc: 'Identity' },
        ].map(({ label, color, desc }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color, marginBottom: '2px', fontWeight: 500 }}>{label}</div>
            <div style={{ fontFamily: 'var(--sans)', fontSize: '11px', color: 'var(--text3)' }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* PDF hint */}
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: '10px',
        color: 'var(--text3)',
        textAlign: 'center',
        opacity: 0.6,
      }}>
        .pdf files open in visual-only mode — no structured data layer
      </div>

      {/* GitHub badge */}
      <a href="https://github.com/etapsky" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', marginTop: '8px', opacity: 0.7 }}>
        <img src="https://img.shields.io/badge/GitHub-Etapsky-181717?style=flat-square&logo=github" alt="github.com/etapsky" style={{ height: 20 }} />
      </a>

    </div>
  )
}
