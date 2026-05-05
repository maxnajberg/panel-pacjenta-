import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
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
  { value: 'all',         label: 'Wszystkie' },
  { value: 'pending',     label: 'Oczekuje' },
  { value: 'confirmed',   label: 'Potwierdzone' },
  { value: 'cancelled',   label: 'Anulowane' },
  { value: 'no_response', label: 'Brak odpowiedzi' },
]

const STAT_CARDS = (counts) => [
  { label: 'Wszystkich wizyt', value: counts.total,     color: '#e4e4e7', borderColor: 'rgba(228,228,231,0.15)' },
  { label: 'Potwierdzonych',   value: counts.confirmed, color: '#4ade80', borderColor: 'rgba(74,222,128,0.3)',   glow: 'rgba(74,222,128,0.05)'  },
  { label: 'Oczekujących',     value: counts.pending,   color: '#facc15', borderColor: 'rgba(250,204,21,0.28)',  glow: 'rgba(250,204,21,0.04)'  },
  { label: 'Anulowanych',      value: counts.cancelled, color: '#f87171', borderColor: 'rgba(248,113,113,0.28)', glow: 'rgba(248,113,113,0.04)' },
]

const ROLE_LABELS = { admin: 'Admin', doctor: 'Lekarz', receptionist: 'Recepcja' }
const ROLE_COLORS = {
  admin:        { color: '#c084fc', border: 'rgba(192,132,252,0.3)', bg: 'rgba(192,132,252,0.08)' },
  doctor:       { color: '#60a5fa', border: 'rgba(96,165,250,0.3)',  bg: 'rgba(96,165,250,0.08)'  },
  receptionist: { color: '#4ade80', border: 'rgba(74,222,128,0.3)',  bg: 'rgba(74,222,128,0.08)'  },
}

export default function Dashboard() {
  const { user, profile, role, signOut } = useAuth()

  const [view, setView] = useState('list')
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [calAddDatetime, setCalAddDatetime] = useState(null)

  const canAddAppointments = role === 'admin' || role === 'receptionist'

  const fetchAppointments = useCallback(async () => {
    const { start, end } = todayRange()
    let query = supabase
      .from('appointments')
      .select('*')
      .gte('appointment_datetime', start)
      .lte('appointment_datetime', end)
      .order('appointment_datetime', { ascending: true })

    if (role === 'doctor' && user) {
      query = query.eq('doctor_id', user.id)
    }

    const { data, error } = await query
    if (!error) setAppointments(data ?? [])
    setLoading(false)
  }, [role, user])

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

  const roleStyle = ROLE_COLORS[role] ?? ROLE_COLORS.receptionist

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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3 flex-wrap">

          {/* Logo */}
          <div className="flex items-center gap-3 mr-auto">
            <div style={{
              width: 38, height: 38,
              background: 'rgba(201,168,76,0.1)',
              border: '1px solid rgba(201,168,76,0.22)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', flexShrink: 0,
            }}>🦷</div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide" style={{ color: '#e4e4e7' }}>Panel Recepcji</h1>
              <p className="text-xs capitalize" style={{ color: '#3f3f46', marginTop: 1 }}>
                {formatDatePL(new Date())}
              </p>
            </div>
          </div>

          {/* View toggle */}
          <div style={{
            display: 'flex', gap: 2,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, padding: 2,
          }}>
            {[{ id: 'list', label: 'Lista' }, { id: 'calendar', label: 'Kalendarz' }].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  padding: '5px 14px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                  cursor: 'pointer', border: 'none', fontFamily: 'Inter, system-ui, sans-serif',
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

          {/* Add button — admin and receptionist only */}
          {canAddAppointments && (
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
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

          {/* Admin panel link */}
          {role === 'admin' && (
            <Link
              to="/admin"
              style={{
                fontSize: 12, fontWeight: 500, color: '#a78bfa',
                textDecoration: 'none', whiteSpace: 'nowrap',
                padding: '5px 10px', borderRadius: 6,
                background: 'rgba(167,139,250,0.07)',
                border: '1px solid rgba(167,139,250,0.18)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.12)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(167,139,250,0.07)' }}
            >
              Użytkownicy
            </Link>
          )}

          {/* Role badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 20,
            background: roleStyle.bg,
            border: `1px solid ${roleStyle.border}`,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: roleStyle.color, whiteSpace: 'nowrap' }}>
              {ROLE_LABELS[role] ?? role}
            </span>
            {profile?.full_name && (
              <span style={{ fontSize: 11, color: '#52525b', whiteSpace: 'nowrap', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {profile.full_name}
              </span>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={signOut}
            style={{
              fontSize: 12, fontWeight: 500, color: '#71717a',
              background: 'none', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 6, padding: '5px 10px', cursor: 'pointer',
              fontFamily: 'Inter, system-ui, sans-serif', transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#f87171'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#71717a'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
          >
            Wyloguj
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
              {STAT_CARDS(counts).map((card) => (
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
            {showForm && canAddAppointments && (
              <AppointmentForm onAdded={() => { fetchAppointments(); setShowForm(false) }} />
            )}

            {/* Section header + filter tabs */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3f3f46' }}>
                  {role === 'doctor' ? 'Moje wizyty dzisiaj' : 'Wizyty dzisiaj'}
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
                      background: 'rgba(59,130,246,0.12)', color: '#60a5fa',
                      border: '1px solid rgba(59,130,246,0.28)', boxShadow: '0 0 12px rgba(59,130,246,0.1)',
                    } : {
                      background: 'rgba(255,255,255,0.03)', color: '#52525b',
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
              <AppointmentList
                appointments={filtered}
                onStatusChanged={handleStatusChanged}
                role={role}
              />
            )}
          </div>
        )}

        {/* ── CALENDAR VIEW ── */}
        {view === 'calendar' && (
          <CalendarView doctorId={role === 'doctor' ? user?.id : null} />
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
