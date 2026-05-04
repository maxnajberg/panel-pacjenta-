const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

const STATUS_COLORS = {
  confirmed: { bg: 'rgba(74,222,128,0.15)', accent: '#4ade80' },
  pending: { bg: 'rgba(250,204,21,0.12)', accent: '#facc15' },
  cancelled: { bg: 'rgba(248,113,113,0.1)', accent: '#f87171' },
  no_response: { bg: 'rgba(113,113,122,0.1)', accent: '#71717a' },
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function formatTimeShort(iso) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

// Returns an array of Date objects covering the 6-week grid for the given month
function getMonthGrid(date) {
  const year = date.getFullYear()
  const month = date.getMonth()

  const firstOfMonth = new Date(year, month, 1)
  const dayOfWeek = firstOfMonth.getDay() // 0=Sun
  const startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // offset to Monday

  const start = new Date(firstOfMonth)
  start.setDate(start.getDate() - startOffset)

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    return d
  })
}

function DayCell({ date, appointments, isCurrentMonth, onDayClick }) {
  const today = new Date()
  const isToday = isSameDay(date, today)
  const visible = appointments.slice(0, 3)
  const overflow = appointments.length - 3

  return (
    <div
      onClick={() => onDayClick(date)}
      style={{
        minHeight: 90,
        padding: '6px 8px',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: isToday ? 'rgba(59,130,246,0.04)' : 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = isToday ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.02)' }}
      onMouseLeave={e => { e.currentTarget.style.background = isToday ? 'rgba(59,130,246,0.04)' : 'transparent' }}
    >
      {/* Day number */}
      <div style={{ marginBottom: 4 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            borderRadius: '50%',
            fontSize: 11,
            fontWeight: isToday ? 700 : 400,
            background: isToday ? '#3b82f6' : 'transparent',
            color: isToday ? '#fff' : isCurrentMonth ? '#a1a1aa' : '#3f3f46',
            boxShadow: isToday ? '0 0 10px rgba(59,130,246,0.5)' : 'none',
          }}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Appointment bars */}
      {visible.map((appt) => {
        const c = STATUS_COLORS[appt.status] ?? STATUS_COLORS.pending
        return (
          <div
            key={appt.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              background: c.bg,
              borderLeft: `2px solid ${c.accent}`,
              borderRadius: 3,
              padding: '1px 4px',
              marginBottom: 2,
              overflow: 'hidden',
            }}
          >
            <span style={{ fontSize: 9, color: c.accent, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {formatTimeShort(appt.appointment_datetime)}
            </span>
            <span style={{ fontSize: 9, color: 'rgba(228,228,231,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {appt.patient_name}
            </span>
          </div>
        )
      })}

      {overflow > 0 && (
        <div style={{ fontSize: 9, color: '#52525b', paddingLeft: 2 }}>
          +{overflow} więcej
        </div>
      )}
    </div>
  )
}

export default function MonthView({ currentDate, appointments, onDayClick }) {
  const grid = getMonthGrid(currentDate)

  const apptsByDay = new Map()
  for (const appt of appointments) {
    const key = new Date(appt.appointment_datetime).toDateString()
    if (!apptsByDay.has(key)) apptsByDay.set(key, [])
    apptsByDay.get(key).push(appt)
  }

  return (
    <div
      className="card"
      style={{ overflow: 'hidden' }}
    >
      {/* Day of week header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          background: '#0a0a10',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            style={{
              padding: '10px 8px',
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#3f3f46',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {grid.map((date) => (
          <DayCell
            key={date.toISOString()}
            date={date}
            appointments={apptsByDay.get(date.toDateString()) ?? []}
            isCurrentMonth={isSameMonth(date, currentDate)}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  )
}
