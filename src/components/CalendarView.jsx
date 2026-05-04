import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import WeekView, { getWeekDays } from './WeekView'
import MonthView from './MonthView'
import AppointmentModal from './AppointmentModal'

function getWeekRange(date) {
  const days = getWeekDays(date)
  const start = new Date(days[0])
  start.setHours(0, 0, 0, 0)
  const end = new Date(days[6])
  end.setHours(23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function getMonthRange(date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start: start.toISOString(), end: end.toISOString() }
}

function formatNavLabel(date, calView) {
  if (calView === 'month') {
    return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
  }
  const days = getWeekDays(date)
  const first = days[0]
  const last = days[6]
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()}–${last.getDate()} ${last.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}`
  }
  const fmt = (d) => d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
  return `${fmt(first)} – ${fmt(last)} ${last.getFullYear()}`
}

const NAV_BTN = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 30,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  color: '#a1a1aa',
  cursor: 'pointer',
  fontSize: 14,
  transition: 'all 0.15s',
  userSelect: 'none',
}

export default function CalendarView({ onAddClick }) {
  const [calView, setCalView] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalDatetime, setModalDatetime] = useState(null)
  const rangeRef = useRef(null)

  const getRange = useCallback(() => {
    return calView === 'week' ? getWeekRange(currentDate) : getMonthRange(currentDate)
  }, [calView, currentDate])

  const fetchAppointments = useCallback(async () => {
    const range = getRange()
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .gte('appointment_datetime', range.start)
      .lte('appointment_datetime', range.end)
      .order('appointment_datetime', { ascending: true })
    if (!error) setAppointments(data ?? [])
    setLoading(false)
  }, [getRange])

  useEffect(() => {
    setLoading(true)
    fetchAppointments()
  }, [fetchAppointments])

  useEffect(() => {
    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, fetchAppointments)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchAppointments])

  const navigate = (dir) => {
    setCurrentDate((prev) => {
      const d = new Date(prev)
      if (calView === 'week') d.setDate(d.getDate() + dir * 7)
      else d.setMonth(d.getMonth() + dir)
      return d
    })
  }

  const handleReschedule = useCallback(async (id, newDatetime) => {
    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, appointment_datetime: newDatetime.toISOString() } : a))
    )
    const { error } = await supabase
      .from('appointments')
      .update({ appointment_datetime: newDatetime.toISOString() })
      .eq('id', id)
    if (error) fetchAppointments() // revert on failure
  }, [fetchAppointments])

  const handleDayClick = (date) => {
    setCurrentDate(date)
    setCalView('week')
  }

  const handleSlotClick = (datetime) => {
    setModalDatetime(datetime)
  }

  return (
    <div>
      {/* Navigation bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Prev / Today / Next */}
        <button style={NAV_BTN} onClick={() => navigate(-1)}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#e4e4e7' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#a1a1aa' }}
        >‹</button>

        <button
          onClick={() => setCurrentDate(new Date())}
          style={{
            ...NAV_BTN,
            width: 'auto',
            padding: '0 10px',
            fontSize: 11,
            fontWeight: 500,
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#e4e4e7' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#a1a1aa' }}
        >
          Dziś
        </button>

        <button style={NAV_BTN} onClick={() => navigate(1)}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#e4e4e7' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#a1a1aa' }}
        >›</button>

        {/* Date range label */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: '#a1a1aa',
            marginLeft: 4,
            textTransform: 'capitalize',
            minWidth: 160,
          }}
        >
          {formatNavLabel(currentDate, calView)}
        </span>

        {/* Week / Month toggle */}
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 2,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            padding: 2,
          }}
        >
          {['week', 'month'].map((v) => (
            <button
              key={v}
              onClick={() => setCalView(v)}
              style={{
                padding: '4px 12px',
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                border: 'none',
                fontFamily: 'Inter, system-ui, sans-serif',
                transition: 'all 0.15s',
                background: calView === v ? 'rgba(59,130,246,0.18)' : 'transparent',
                color: calView === v ? '#60a5fa' : '#52525b',
                boxShadow: calView === v ? '0 0 10px rgba(59,130,246,0.1)' : 'none',
              }}
            >
              {v === 'week' ? 'Tydzień' : 'Miesiąc'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2rem', color: '#3f3f46' }}>
          <div
            className="animate-spin"
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              border: '2px solid rgba(59,130,246,0.25)',
              borderTopColor: '#3b82f6',
            }}
          />
          <span style={{ fontSize: '0.8125rem' }}>Ładowanie kalendarza…</span>
        </div>
      )}

      {/* Views */}
      {!loading && calView === 'week' && (
        <WeekView
          currentDate={currentDate}
          appointments={appointments}
          onSlotClick={handleSlotClick}
          onReschedule={handleReschedule}
        />
      )}
      {!loading && calView === 'month' && (
        <MonthView
          currentDate={currentDate}
          appointments={appointments}
          onDayClick={handleDayClick}
        />
      )}

      {/* Add appointment modal */}
      {modalDatetime !== null && (
        <AppointmentModal
          initialDateTime={modalDatetime}
          onClose={() => setModalDatetime(null)}
          onAdded={() => setModalDatetime(null)}
        />
      )}
    </div>
  )
}
