import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AppointmentList from '../components/AppointmentList'
import AppointmentForm from '../components/AppointmentForm'

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function formatDatePL(date) {
  return date.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'pending', label: 'Oczekuje' },
  { value: 'confirmed', label: 'Potwierdzone' },
  { value: 'cancelled', label: 'Anulowane' },
  { value: 'no_response', label: 'Brak odpowiedzi' },
]

export default function Dashboard() {
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)

  const fetchAppointments = useCallback(async () => {
    const { start, end } = todayRange()
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .gte('appointment_datetime', start)
      .lte('appointment_datetime', end)
      .order('appointment_datetime', { ascending: true })

    if (!error) setAppointments(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchAppointments()

    const channel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchAppointments])

  const handleStatusChanged = (id, newStatus) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    )
  }

  const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter)

  const counts = {
    total: appointments.length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    pending: appointments.filter((a) => a.status === 'pending').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    no_response: appointments.filter((a) => a.status === 'no_response').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🦷</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Panel Recepcji</h1>
              <p className="text-xs text-gray-500 capitalize">{formatDatePL(new Date())}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            {showForm ? 'Ukryj formularz' : '+ Dodaj wizytę'}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Wszystkich wizyt', value: counts.total, color: 'text-gray-800' },
            { label: 'Potwierdzonych', value: counts.confirmed, color: 'text-green-700' },
            { label: 'Oczekujących', value: counts.pending, color: 'text-yellow-700' },
            { label: 'Anulowanych', value: counts.cancelled, color: 'text-red-700' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <AppointmentForm onAdded={() => { fetchAppointments(); setShowForm(false) }} />
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                filter === opt.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Appointments list */}
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Ładowanie…</div>
        ) : (
          <AppointmentList appointments={filtered} onStatusChanged={handleStatusChanged} />
        )}
      </main>
    </div>
  )
}
