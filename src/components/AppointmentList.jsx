import { useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from './StatusBadge'
import IntakeSharePanel from './IntakeSharePanel'

const STATUS_OPTIONS = [
  { value: 'confirmed',   label: 'Potwierdzona' },
  { value: 'pending',     label: 'Oczekuje' },
  { value: 'no_response', label: 'Brak odpowiedzi' },
  { value: 'cancelled',   label: 'Anulowana' },
]

function formatTime(datetimeISO) {
  return new Date(datetimeISO).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

function CopyLink({ id }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/confirm/${id}`

  const copy = async (e) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      title="Kopiuj link potwierdzenia"
      className="text-xs font-medium transition-all duration-200 whitespace-nowrap px-2.5 py-1 rounded-md"
      style={copied ? {
        color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
      } : {
        color: '#3b82f6', background: 'rgba(59,130,246,0.07)', border: '1px solid rgba(59,130,246,0.18)',
      }}
    >
      {copied ? '✓ Skopiowano' : 'Kopiuj link'}
    </button>
  )
}

function FormularzButton({ appt }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true) }}
        title="Wyślij formularz pacjentowi"
        className="text-xs font-medium transition-all duration-200 whitespace-nowrap px-2.5 py-1 rounded-md"
        style={appt.patient ? {
          color: '#4ade80', background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.2)',
        } : {
          color: '#a78bfa', background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)',
        }}
      >
        {appt.patient ? '✓ Wypełniony' : 'Formularz'}
      </button>

      {open && (
        <IntakeSharePanel
          appointmentId={appt.id}
          phone={appt.phone}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function StatusSelect({ appointmentId, current, onChanged }) {
  const [loading, setLoading] = useState(false)

  const handleChange = async (e) => {
    e.stopPropagation()
    const newStatus = e.target.value
    setLoading(true)
    await supabase.from('appointments').update({ status: newStatus }).eq('id', appointmentId)
    setLoading(false)
    onChanged?.(appointmentId, newStatus)
  }

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <select
        value={current}
        onChange={handleChange}
        disabled={loading}
        className="appearance-none text-xs pl-2.5 pr-7 py-1.5 rounded-md cursor-pointer focus:outline-none transition-all duration-150 disabled:opacity-40"
        style={{
          background: '#16161e', border: '1px solid rgba(255,255,255,0.08)',
          color: '#a1a1aa', fontFamily: 'Inter, system-ui, sans-serif',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.4)'; e.target.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.08)' }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none' }}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
        <svg className="w-3 h-3" style={{ color: '#52525b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}

export default function AppointmentList({ appointments, onStatusChanged, role, onRowClick }) {
  const isDoctor = role === 'doctor'

  if (appointments.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: '#27272a' }}>
        <div className="text-4xl mb-3 opacity-40">📋</div>
        <p className="text-sm" style={{ color: '#3f3f46' }}>Brak wizyt na dziś</p>
      </div>
    )
  }

  const headers = isDoctor
    ? ['Godzina', 'Pacjent', 'Rodzaj wizyty', 'Notatki', 'Status', 'Zmień status']
    : ['Godzina', 'Pacjent', 'Telefon', 'Rodzaj wizyty', 'Status', 'Zmień status', 'Link pacjenta', 'Formularz']

  return (
    <div className="overflow-x-auto rounded-[0.875rem]" style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: '#0a0a10', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {headers.map((h) => (
              <th
                key={h}
                className="px-5 py-3.5 text-left font-semibold whitespace-nowrap"
                style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3f3f46' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {appointments.map((appt, i) => (
            <tr
              key={appt.id}
              onClick={() => onRowClick?.(appt)}
              className="tr-hover"
              style={{
                borderBottom: i < appointments.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                cursor: onRowClick ? 'pointer' : 'default',
              }}
            >
              <td className="px-5 py-3.5 whitespace-nowrap" style={{ fontFamily: 'monospace', fontWeight: 600, color: '#e4e4e7', letterSpacing: '0.02em' }}>
                {formatTime(appt.appointment_datetime)}
              </td>

              <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: '#d4d4d8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span className="font-medium">{appt.patient_name}</span>
                  {!isDoctor && appt.patient && (
                    <span
                      title="Formularz wypełniony"
                      style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px rgba(74,222,128,0.6)', flexShrink: 0 }}
                    />
                  )}
                </div>
              </td>

              {/* Phone — hidden for doctors */}
              {!isDoctor && (
                <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: '#71717a', fontVariantNumeric: 'tabular-nums' }}>
                  {appt.phone}
                </td>
              )}

              <td className="px-5 py-3.5" style={{ color: '#71717a' }}>
                {appt.visit_type}
              </td>

              {/* Notes — doctors only */}
              {isDoctor && (
                <td className="px-5 py-3.5" style={{ color: '#71717a', maxWidth: 200 }}>
                  {appt.notes
                    ? <span style={{ fontSize: 12 }}>{appt.notes}</span>
                    : <span style={{ color: '#27272a', fontSize: 12 }}>—</span>
                  }
                </td>
              )}

              <td className="px-5 py-3.5">
                <StatusBadge status={appt.status} />
              </td>
              <td className="px-5 py-3.5">
                <StatusSelect
                  appointmentId={appt.id}
                  current={appt.status}
                  onChanged={onStatusChanged}
                />
              </td>

              {/* Confirm link + formularz buttons — hidden for doctors */}
              {!isDoctor && (
                <>
                  <td className="px-5 py-3.5">
                    <CopyLink id={appt.id} />
                  </td>
                  <td className="px-5 py-3.5">
                    <FormularzButton appt={appt} />
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
