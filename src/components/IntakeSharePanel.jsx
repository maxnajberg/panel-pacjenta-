import { useState } from 'react'
import QrCodeModal from './QrCodeModal'

export default function IntakeSharePanel({ appointmentId, phone, onClose }) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
  const url = `${window.location.origin}/intake/${appointmentId}`

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const sendSms = () => {
    const tel = (phone ?? '').replace(/\s+/g, '')
    const body = encodeURIComponent(`Proszę wypełnić formularz przed wizytą: ${url}`)
    window.open(`sms:${tel}?body=${body}`, '_self')
  }

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: '#111118', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: 24, maxWidth: 380, width: '100%',
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7', margin: 0 }}>
              Wyślij formularz pacjentowi
            </h3>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 4 }}
            >
              ✕
            </button>
          </div>

          {/* URL preview */}
          <div style={{
            background: '#0a0a10', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 8, padding: '9px 12px', marginBottom: 14,
          }}>
            <p style={{ fontSize: 11, color: '#3f3f46', fontFamily: 'monospace', wordBreak: 'break-all', margin: 0 }}>
              {url}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ActionButton
              onClick={copyLink}
              active={copied}
              icon={copied ? '✓' : '🔗'}
              label={copied ? 'Skopiowano!' : 'Kopiuj link'}
              activeColor="#4ade80"
              activeBg="rgba(74,222,128,0.08)"
              activeBorder="rgba(74,222,128,0.3)"
              color="#60a5fa"
              bg="rgba(59,130,246,0.08)"
              border="rgba(59,130,246,0.25)"
            />
            <ActionButton
              onClick={() => setShowQr(true)}
              icon="▦"
              label="Pokaż kod QR"
            />
            <ActionButton
              onClick={sendSms}
              icon="💬"
              label="Wyślij SMS"
            />
          </div>
        </div>
      </div>

      {showQr && <QrCodeModal url={url} onClose={() => setShowQr(false)} />}
    </>
  )
}

function ActionButton({ onClick, icon, label, active, activeColor, activeBg, activeBorder, color, bg, border }) {
  const isStyled = color !== undefined
  return (
    <button
      onClick={onClick}
      style={{
        padding: '11px 14px', borderRadius: 8,
        border: `1px solid ${active && activeBorder ? activeBorder : border ?? 'rgba(255,255,255,0.08)'}`,
        background: active && activeBg ? activeBg : bg ?? 'rgba(255,255,255,0.03)',
        color: active && activeColor ? activeColor : color ?? '#a1a1aa',
        fontSize: 13, fontWeight: 500, cursor: 'pointer',
        fontFamily: 'Inter, system-ui, sans-serif',
        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
        transition: 'all 0.2s',
        width: '100%',
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1, minWidth: 18, textAlign: 'center' }}>{icon}</span>
      {label}
    </button>
  )
}
