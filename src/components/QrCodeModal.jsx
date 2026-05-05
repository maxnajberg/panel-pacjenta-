import { QRCodeCanvas } from 'qrcode.react'

const QR_ID = 'intake-qr-canvas'

export default function QrCodeModal({ url, onClose }) {
  const download = () => {
    const canvas = document.getElementById(QR_ID)
    if (!canvas) return
    const link = document.createElement('a')
    link.download = 'formularz-pacjenta-qr.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: 28,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18,
          maxWidth: 300, width: '100%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7', margin: 0 }}>
          Kod QR formularza
        </h3>

        <div style={{ padding: 14, background: '#ffffff', borderRadius: 10 }}>
          <QRCodeCanvas id={QR_ID} value={url} size={196} level="M" includeMargin={false} />
        </div>

        <p style={{ fontSize: 11, color: '#52525b', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
          Pacjent skanuje kod i wypełnia formularz na telefonie
        </p>

        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
          <button
            onClick={download}
            style={{
              flex: 1, padding: 10, borderRadius: 8,
              border: '1px solid rgba(59,130,246,0.3)',
              background: 'rgba(59,130,246,0.08)', color: '#60a5fa',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Pobierz PNG
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: 10, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'transparent', color: '#71717a',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  )
}
