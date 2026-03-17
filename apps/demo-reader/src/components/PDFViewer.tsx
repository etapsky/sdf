import { useEffect, useRef } from 'react'

interface Props {
  pdfBytes: Uint8Array;
}

export default function PDFViewer({ pdfBytes }: Props) {
  const ref = useRef<HTMLIFrameElement>(null)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    // Revoke previous URL
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
    }

    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    urlRef.current = url

    if (ref.current) {
      ref.current.src = url
    }

    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
      }
    }
  }, [pdfBytes])

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: 'var(--bg2)',
      borderRadius: '8px',
      overflow: 'hidden',
      border: '1px solid var(--border)',
    }}>
      {/* Header bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '32px',
        background: 'var(--bg3)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        zIndex: 1,
        gap: '8px',
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--coral)" strokeWidth="2" strokeLinecap="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: '10px',
          color: 'var(--text3)',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          fontWeight: 500,
        }}>visual.pdf</span>
        <span style={{
          marginLeft: 'auto',
          fontFamily: 'var(--mono)',
          fontSize: '10px',
          color: 'var(--text3)',
        }}>{(pdfBytes.length / 1024).toFixed(1)} KB</span>
      </div>

      <iframe
        ref={ref}
        style={{
          position: 'absolute',
          top: '32px',
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: 'calc(100% - 32px)',
          border: 'none',
          background: 'white',
        }}
        title="SDF visual layer"
      />
    </div>
  )
}