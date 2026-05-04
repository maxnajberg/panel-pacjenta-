import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AppointmentList from '../components/AppointmentList'
import AppointmentForm from '../components/AppointmentForm'
import AppointmentModal from '../components/AppointmentModal'
import CalendarView from '../components/CalendarView'

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

const STAT_CARDS = (counts) => [
  { label: 'Wszystkich wizyt', value: counts.total,     color: '#e4e4e7', borderColor: 'rgba(228,228,231,0.15)' },
  { label: 'Potwierdzonych',   value: counts.confirmed, color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)',  glow: 'rgba(74,222,128,0.05)' },
  { label: 'Oczekujących',     value: counts.pending,   color: '#facc15', borderColor: 'rgba(250,204,21,0.28)', glow: 'rgba(250,204,21,0.04)' },
  { label: 'Anulowanych',      value: counts.cancelled, color: '#f87171', borderColor: 'rgba(248,113,113,0.28)',glow: 'rgba(248,113,113,0.04)' },
]

export default function Dashboard() {
  const [view, setView] = useState('list')             // 'list' | 'calendar'
  const [appointments, setAppointments] = useState([]) // list-mode appointments (today only)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [calAddDatetime, setCalAddDatetime] = useState(null) // calendar-mode modal

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
      .channel('dashboard-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchAppointments])

  const handleStatusChanged = (id, newStatus) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a)))
  }

  const filtered = filter === 'all' ? appointments : appointments.filter((a) => a.status === filter)

  const counts = {
    total:     appointments.length,
    confirmed: appointments.filter((a) => a.status === 'confirmed').length,
    pending:   appointments.filter((a) => a.status === 'pending').length,
    cancelled: appointments.filter((a) => a.status === 'cancelled').length,
  }

  const cards = STAT_CARDS(counts)

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>

      {/* Ambient gradient */}
      <div
        className="fixed top-0 left-0 right-0 pointer-events-none"
        style={{
          height: 300,
          background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(59,130,246,0.07) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        className="relative z-10 sticky top-0"
        style={{
          background: 'rgba(10,10,10,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 mr-auto">
            <div
              style={{
                width: 38, height: 38,
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid rgba(201,168,76,0.22)',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', flexShrink: 0,
              }}
            >🦷</div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide" style={{ color: '#e4e4e7' }}>Panel Recepcji</h1>
              <p className="text-xs capitalize" style={{ color: '#3f3f46', marginTop: 1 }}>
                {formatDatePL(new Date())}
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div
            style={{
              display: 'flex', gap: 2,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: 2,
            }}
          >
            {[
              { id: 'list', label: 'Lista' },
              { id: 'calendar', label: 'Kalendarz' },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  padding: '5px 14px',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: 'none',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  transition: 'all 0.15s',
                  background: view === v.id ? 'rgba(59,130,246,0.18)' : 'transparent',
                  color: view === v.id ? '#60a5fa' : '#52525b',
                  boxShadow: view === v.id ? '0 0 10px rgba(59,130,246,0.1)' : 'none',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Add button */}
          <button
            onClick={() => {
              if (view === 'list') setShowForm((s) => !s)
              else setCalAddDatetime(new Date())
            }}
            className="btn-primary px-4 py-2"
          >
            {view === 'list'
              ? showForm ? 'Ukryj formularz' : '+ Dodaj wizytę'
              : '+ Dodaj wizytę'
            }
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {cards.map((card) => (
                <div
                  key={card.label}
                  className="card p-5 transition-all duration-300"
                  style={{
                    borderTop: `1px solid ${card.borderColor}`,
                    background: card.glow
                      ? `radial-gradient(ellipse 80% 60% at 50% 0%, ${card.glow}, transparent), #111118`
                      : '#111118',
                  }}
                >
                  <div className="text-3xl font-bold" style={{ color: card.color, lineHeight: 1.1 }}>
                    {card.value}
                  </div>
                  <div className="mt-1.5 text-xs tracking-wide" style={{ color: '#3f3f46' }}>
                    {card.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Add form */}
            {showForm && (
              <AppointmentForm onAdded={() => { fetchAppointments(); setShowForm(false) }} />
            )}

            {/* Section header + filter tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3f3f46' }}>
                  Wizyty dzisiaj
                </span>
                <div style={{ height: 1, width: 24, background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                    style={filter === opt.value ? {
                      background: 'rgba(59,130,246,0.12)',
                      color: '#60a5fa',
                      border: '1px solid rgba(59,130,246,0.28)',
                      boxShadow: '0 0 12px rgba(59,130,246,0.1)',
                    } : {
                      background: 'rgba(255,255,255,0.03)',
                      color: '#52525b',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Appointment list */}
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2.5">
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: 'rgba(59,130,246,0.4)', borderTopColor: 'transparent' }}
                />
                <span className="text-sm" style={{ color: '#3f3f46' }}>Ładowanie…</span>
              </div>
            ) : (
              <AppointmentList appointments={filtered} onStatusChanged={handleStatusChanged} />
            )}
          </div>
        )}

        {/* ── CALENDAR VIEW ── */}
        {view === 'calendar' && (
          <CalendarView />
        )}
      </main>

      {/* Calendar-mode add modal */}
      {calAddDatetime !== null && (
        <AppointmentModal
          initialDateTime={calAddDatetime}
          onClose={() => setCalAddDatetime(null)}
          onAdded={() => setCalAddDatetime(null)}
        />
      )}
    </div>
  )
}
