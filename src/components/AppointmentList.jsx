import { useState } from 'react'
import { supabase } from '../lib/supabase'
import StatusBadge from './StatusBadge'

const STATUS_OPTIONS = [
  { value: 'confirmed', label: 'Potwierdzona' },
  { value: 'pending', label: 'Oczekuje' },
  { value: 'no_response', label: 'Brak odpowiedzi' },
  { value: 'cancelled', label: 'Anulowana' },
]

function formatTime(datetimeISO) {
  return new Date(datetimeISO).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

function CopyLink({ id }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/confirm/${id}`

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      title="Kopiuj link dla pacjenta"
      className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 whitespace-nowrap"
    >
      {copied ? 'Skopiowano!' : 'Kopiuj link'}
    </button>
  )
}

function StatusSelect({ appointmentId, current, onChanged }) {
  const [loading, setLoading] = useState(false)

  const handleChange = async (e) => {
    const newStatus = e.target.value
    setLoading(true)
    await supabase.from('appointments').update({ status: newStatus }).eq('id', appointmentId)
    setLoading(false)
    onChanged?.(appointmentId, newStatus)
  }

  return (
    <select
      value={current}
      onChange={handleChange}
      disabled={loading}
      className="border border-gray-200 rounded-md text-xs px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

export default function AppointmentList({ appointments, onStatusChanged }) {
  if (appointments.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        Brak wizyt na dziś.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
          <tr>
            <th className="px-4 py-3 text-left">Godzina</th>
            <th className="px-4 py-3 text-left">Pacjent</th>
            <th className="px-4 py-3 text-left">Telefon</th>
            <th className="px-4 py-3 text-left">Rodzaj wizyty</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Zmień status</th>
            <th className="px-4 py-3 text-left">Link pacjenta</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {appointments.map((appt) => (
            <tr key={appt.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-mono font-medium text-gray-800 whitespace-nowrap">
                {formatTime(appt.appointment_datetime)}
              </td>
              <td className="px-4 py-3 font-medium text-gray-800">{appt.patient_name}</td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{appt.phone}</td>
              <td className="px-4 py-3 text-gray-600">{appt.visit_type}</td>
              <td className="px-4 py-3">
                <StatusBadge status={appt.status} />
              </td>
              <td className="px-4 py-3">
                <StatusSelect
                  appointmentId={appt.id}
                  current={appt.status}
                  onChanged={onStatusChanged}
                />
              </td>
              <td className="px-4 py-3">
                <CopyLink id={appt.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
