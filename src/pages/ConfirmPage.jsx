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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Ładowanie…</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-semibold text-gray-800 mb-2">Nie znaleziono wizyty</h1>
          <p className="text-gray-500 text-sm">Link może być nieprawidłowy lub wizyta została usunięta.</p>
        </div>
      </div>
    )
  }

  const alreadyActioned = ALREADY_ACTIONED.includes(appointment.status)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-md w-full max-w-md p-8">
        <div className="text-center mb-6">
          <span className="text-4xl">🦷</span>
          <h1 className="text-xl font-bold text-gray-900 mt-2">Potwierdzenie wizyty</h1>
          <p className="text-sm text-gray-500 mt-1">Gabinet Stomatologiczny</p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Pacjent</span>
            <span className="font-medium text-gray-800">{appointment.patient_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Termin</span>
            <span className="font-medium text-gray-800 text-right max-w-[60%] capitalize">
              {formatDateTimePL(appointment.appointment_datetime)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Rodzaj wizyty</span>
            <span className="font-medium text-gray-800">{appointment.visit_type}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Status</span>
            <StatusBadge status={appointment.status} />
          </div>
        </div>

        {done === 'confirmed' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">✅</div>
            <p className="text-green-800 font-medium text-sm">Wizyta potwierdzona!</p>
            <p className="text-green-600 text-xs mt-1">Dziękujemy. Do zobaczenia!</p>
          </div>
        )}

        {done === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">❌</div>
            <p className="text-red-800 font-medium text-sm">Wizyta anulowana.</p>
            <p className="text-red-600 text-xs mt-1">Skontaktuj się z nami, aby umówić nowy termin.</p>
          </div>
        )}

        {!done && !alreadyActioned && (
          <div className="space-y-3">
            <button
              onClick={() => handleAction('confirmed')}
              disabled={!!actionLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {actionLoading === 'confirmed' ? 'Zapisywanie…' : '✓ Potwierdzam wizytę'}
            </button>
            <button
              onClick={() => handleAction('cancelled')}
              disabled={!!actionLoading}
              className="w-full bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 font-medium py-3 rounded-xl text-sm border border-red-200 hover:border-red-300 transition-colors"
            >
              {actionLoading === 'cancelled' ? 'Zapisywanie…' : '✕ Anuluj wizytę'}
            </button>
          </div>
        )}

        {!done && alreadyActioned && (
          <p className="text-center text-sm text-gray-500">
            Ta wizyta została już{' '}
            {appointment.status === 'confirmed' ? 'potwierdzona' : 'anulowana'}.
          </p>
        )}
      </div>
    </div>
  )
}
