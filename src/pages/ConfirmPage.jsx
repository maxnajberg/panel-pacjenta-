import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import StatusBadge from '../components/StatusBadge'

function formatDateTimePL(iso) {
  return new Date(iso).toLocaleString('pl-PL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const ALREADY_ACTIONED = ['confirmed', 'cancelled']

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span className="text-xs shrink-0" style={{ color: '#52525b' }}>{label}</span>
      <span className="text-xs font-medium text-right" style={{ color: '#d4d4d8' }}>{children}</span>
    </div>
  )
}

export default function ConfirmPage() {
  const { id } = useParams()
  const [appointment, setAppointment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
      } else {
        setAppointment(data)
      }
      setLoading(false)
    }
    fetch()
  }, [id])

  const handleAction = async (newStatus) => {
    setActionLoading(newStatus)
    const { error } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)

    setActionLoading(null)
    if (!error) {
      setAppointment((prev) => ({ ...prev, status: newStatus }))
      setDone(newStatus)
    }
  }

  const pageStyle = {
    minHeight: '100vh',
    background: '#0a0a0a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    position: 'relative',
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#3f3f46' }}>
          <div
            className="animate-spin"
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '2px solid rgba(59,130,246,0.3)',
              borderTopColor: '#3b82f6',
            }}
          />
          <span style={{ fontSize: '0.875rem' }}>Ładowanie…</span>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', maxWidth: 320 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.3 }}>🔍</div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#d4d4d8', marginBottom: 8 }}>
            Nie znaleziono wizyty
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#52525b' }}>
            Link może być nieprawidłowy lub wizyta została usunięta.
          </p>
        </div>
      </div>
    )
  }

  const alreadyActioned = ALREADY_ACTIONED.includes(appointment.status)

  return (
    <div style={pageStyle}>

      {/* Ambient glow */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 300,
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#111118',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '1.125rem',
          padding: '2rem',
          position: 'relative',
          zIndex: 1,
        }}
      >

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.22)',
              borderRadius: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              marginBottom: 14,
            }}
          >
            🦷
          </div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#e4e4e7', marginBottom: 4 }}>
            Potwierdzenie wizyty
          </h1>
          <p style={{ fontSize: '0.7rem', color: '#3f3f46', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Gabinet Stomatologiczny
          </p>
        </div>

        {/* Appointment details */}
        <div
          style={{
            background: '#0c0c14',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '0.75rem',
            padding: '0.25rem 1rem',
            marginBottom: '1.5rem',
          }}
        >
          <DetailRow label="Pacjent">{appointment.patient_name}</DetailRow>
          <DetailRow label="Termin">
            <span style={{ textTransform: 'capitalize' }}>
              {formatDateTimePL(appointment.appointment_datetime)}
            </span>
          </DetailRow>
          <DetailRow label="Rodzaj wizyty">{appointment.visit_type}</DetailRow>
          <div className="flex items-center justify-between gap-4 py-3">
            <span className="text-xs" style={{ color: '#52525b' }}>Status</span>
            <StatusBadge status={appointment.status} />
          </div>
        </div>

        {/* Success state */}
        {done === 'confirmed' && (
          <div
            style={{
              background: 'rgba(74,222,128,0.07)',
              border: '1px solid rgba(74,222,128,0.2)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              textAlign: 'center',
              boxShadow: '0 0 24px rgba(74,222,128,0.08)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>✅</div>
            <p style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>
              Wizyta potwierdzona!
            </p>
            <p style={{ color: '#52525b', fontSize: '0.75rem' }}>Dziękujemy. Do zobaczenia!</p>
          </div>
        )}

        {/* Cancelled state */}
        {done === 'cancelled' && (
          <div
            style={{
              background: 'rgba(248,113,113,0.07)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              textAlign: 'center',
              boxShadow: '0 0 24px rgba(248,113,113,0.08)',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>❌</div>
            <p style={{ color: '#f87171', fontWeight: 600, fontSize: '0.875rem', marginBottom: 4 }}>
              Wizyta anulowana.
            </p>
            <p style={{ color: '#52525b', fontSize: '0.75rem' }}>
              Skontaktuj się z nami, aby umówić nowy termin.
            </p>
          </div>
        )}

        {/* Action buttons */}
        {!done && !alreadyActioned && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={() => handleAction('confirmed')}
              disabled={!!actionLoading}
              className="btn-confirm"
            >
              {actionLoading === 'confirmed' ? 'Zapisywanie…' : '✓ Potwierdzam wizytę'}
            </button>
            <button
              onClick={() => handleAction('cancelled')}
              disabled={!!actionLoading}
              className="btn-cancel-outline"
            >
              {actionLoading === 'cancelled' ? 'Zapisywanie…' : '✕ Anuluj wizytę'}
            </button>
          </div>
        )}

        {/* Already actioned */}
        {!done && alreadyActioned && (
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: '#52525b' }}>
            Ta wizyta została już{' '}
            {appointment.status === 'confirmed' ? 'potwierdzona' : 'anulowana'}.
          </p>
        )}
      </div>
    </div>
  )
}
