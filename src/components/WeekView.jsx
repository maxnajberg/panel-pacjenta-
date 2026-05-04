import { useState, useRef, useEffect, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'

const START_HOUR = 7
const END_HOUR = 20
const HOUR_HEIGHT = 64
const TOTAL_HEIGHT = (END_HOUR - START_HOUR) * HOUR_HEIGHT // 832px
const SCROLL_CONTAINER_HEIGHT = 520

const STATUS_COLORS = {
  confirmed: { bg: 'rgba(74,222,128,0.14)', border: 'rgba(74,222,128,0.3)', text: '#4ade80', accent: '#4ade80' },
  pending:   { bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.26)', text: '#facc15', accent: '#facc15' },
  cancelled: { bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.26)', text: '#f87171', accent: '#f87171' },
  no_response: { bg: 'rgba(113,113,122,0.1)', border: 'rgba(113,113,122,0.2)', text: '#71717a', accent: '#71717a' },
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function getWeekDays(anchorDate) {
  const date = new Date(anchorDate)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date)
    d.setDate(d.getDate() + i)
    return d
  })
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
}

// Assign _col / _totalCols to overlapping appointments
function resolveLayout(appointments) {
  if (appointments.length <= 1) {
    return appointments.map((a) => ({ ...a, _col: 0, _totalCols: 1 }))
  }

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.appointment_datetime) - new Date(b.appointment_datetime)
  )

  const groups = []
  for (const appt of sorted) {
    const start = new Date(appt.appointment_datetime).getTime()
    const end = start + (appt.duration_minutes || 30) * 60_000

    let placed = false
    for (const group of groups) {
      const groupEnd = Math.max(
        ...group.map((a) => new Date(a.appointment_datetime).getTime() + (a.duration_minutes || 30) * 60_000)
      )
      if (start < groupEnd) {
        group.push(appt)
        placed = true
        break
      }
    }
    if (!placed) groups.push([appt])
  }

  const result = []
  for (const group of groups) {
    group.forEach((appt, col) => result.push({ ...appt, _col: col, _totalCols: group.length }))
  }
  return result
}

// Individual draggable appointment block
function AppointmentBlock({ appointment }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: appointment.id,
    data: { appointment },
  })

  const dt = new Date(appointment.appointment_datetime)
  const top = Math.max(0, (dt.getHours() - START_HOUR) * HOUR_HEIGHT + (dt.getMinutes() / 60) * HOUR_HEIGHT)
  const height = Math.max(((appointment.duration_minutes || 30) / 60) * HOUR_HEIGHT, 22)
  const c = STATUS_COLORS[appointment.status] ?? STATUS_COLORS.pending
  const widthPct = 100 / appointment._totalCols
  const leftPct = appointment._col * widthPct

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - ${appointment._totalCols > 1 ? 5 : 4}px)`,
        height,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.accent}`,
        borderRadius: 5,
        padding: '2px 5px',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.25 : 1,
        zIndex: isDragging ? 0 : 2,
        overflow: 'hidden',
        userSelect: 'none',
        boxSizing: 'border-box',
        transition: 'opacity 0.1s',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: c.text, lineHeight: 1.4, whiteSpace: 'nowrap' }}>
        {formatTime(appointment.appointment_datetime)}
      </div>
      {height > 34 && (
        <div style={{ fontSize: 10, color: 'rgba(228,228,231,0.5)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {appointment.patient_name}
        </div>
      )}
    </div>
  )
}

// Drag overlay ghost (follows cursor)
function BlockGhost({ appointment }) {
  const c = STATUS_COLORS[appointment.status] ?? STATUS_COLORS.pending
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderLeft: `3px solid ${c.accent}`,
        borderRadius: 5,
        padding: '4px 8px',
        minWidth: 90,
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 16px ${c.accent}22`,
        opacity: 0.95,
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 700, color: c.text }}>{formatTime(appointment.appointment_datetime)}</div>
      <div style={{ fontSize: 10, color: 'rgba(228,228,231,0.6)' }}>{appointment.patient_name}</div>
    </div>
  )
}

// Single day column — droppable, renders appointment blocks
function DayColumn({ date, appointments, onSlotClick }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${date.toISOString().slice(0, 10)}`,
    data: { date },
  })

  const isToday = isSameDay(date, new Date())
  const laid = resolveLayout(appointments)

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const rawMins = (y / HOUR_HEIGHT) * 60
    const snapped = Math.round(rawMins / 30) * 30
    const totalMins = START_HOUR * 60 + snapped
    const hour = Math.min(Math.floor(totalMins / 60), END_HOUR - 1)
    const minute = totalMins % 60
    const dt = new Date(date)
    dt.setHours(hour, minute, 0, 0)
    onSlotClick(dt)
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        position: 'relative',
        flex: 1,
        height: TOTAL_HEIGHT,
        borderLeft: '1px solid rgba(255,255,255,0.05)',
        background: isOver
          ? 'rgba(59,130,246,0.06)'
          : isToday
          ? 'rgba(59,130,246,0.025)'
          : 'transparent',
        transition: 'background 0.1s',
        cursor: 'default',
        zIndex: 1,
      }}
      onClick={handleClick}
    >
      {laid.map((appt) => (
        <AppointmentBlock key={appt.id} appointment={appt} />
      ))}
    </div>
  )
}

export default function WeekView({ currentDate, appointments, onSlotClick, onReschedule }) {
  const weekDays = getWeekDays(currentDate)
  const scrollRef = useRef(null)
  const [activeAppt, setActiveAppt] = useState(null)

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const now = new Date()
    const top = Math.max(0, (now.getHours() - START_HOUR - 1) * HOUR_HEIGHT)
    scrollRef.current.scrollTop = top
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const handleDragStart = useCallback(({ active }) => {
    setActiveAppt(active.data.current.appointment)
  }, [])

  const handleDragEnd = useCallback(
    ({ active, delta, over }) => {
      setActiveAppt(null)
      if (!over) return

      const appt = active.data.current.appointment
      const targetDate = over.data.current.date

      const dt = new Date(appt.appointment_datetime)
      const originalTop =
        (dt.getHours() - START_HOUR) * HOUR_HEIGHT + (dt.getMinutes() / 60) * HOUR_HEIGHT

      const newTop = Math.max(
        0,
        Math.min(originalTop + delta.y, TOTAL_HEIGHT - HOUR_HEIGHT / 2)
      )

      const totalMins = START_HOUR * 60 + (newTop / HOUR_HEIGHT) * 60
      const snapped = Math.round(totalMins / 30) * 30
      const newHour = Math.min(Math.floor(snapped / 60), END_HOUR - 1)
      const newMinute = snapped % 60

      const newDatetime = new Date(targetDate)
      newDatetime.setHours(newHour, newMinute, 0, 0)

      if (newDatetime.getTime() === dt.getTime()) return
      onReschedule(appt.id, newDatetime)
    },
    [onReschedule]
  )

  const now = new Date()
  const isCurrentWeek = weekDays.some((d) => isSameDay(d, now))
  const nowTop = isCurrentWeek
    ? (now.getHours() - START_HOUR) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT
    : null

  // Appointments grouped by day
  const apptsByDay = new Map(weekDays.map((d) => [d.toDateString(), []]))
  for (const appt of appointments) {
    const key = new Date(appt.appointment_datetime).toDateString()
    if (apptsByDay.has(key)) apptsByDay.get(key).push(appt)
  }

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i)

  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Day header row */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: '#0a0a10',
        }}
      >
        <div style={{ width: 52, flexShrink: 0 }} />
        {weekDays.map((d) => {
          const isToday = isSameDay(d, now)
          return (
            <div
              key={d.toISOString()}
              style={{
                flex: 1,
                padding: '10px 4px',
                textAlign: 'center',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: isToday ? '#3b82f6' : '#3f3f46',
                  marginBottom: 3,
                }}
              >
                {d.toLocaleDateString('pl-PL', { weekday: 'short' }).replace('.', '')}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  fontSize: 12,
                  fontWeight: isToday ? 700 : 400,
                  background: isToday ? '#3b82f6' : 'transparent',
                  color: isToday ? '#fff' : '#a1a1aa',
                  boxShadow: isToday ? '0 0 12px rgba(59,130,246,0.5)' : 'none',
                }}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} style={{ height: SCROLL_CONTAINER_HEIGHT, overflowY: 'auto' }}>
        <DndContext
          sensors={sensors}
          modifiers={[restrictToWindowEdges]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div style={{ display: 'flex', height: TOTAL_HEIGHT }}>
            {/* Time labels */}
            <div style={{ width: 52, flexShrink: 0, position: 'relative', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    position: 'absolute',
                    top: (h - START_HOUR) * HOUR_HEIGHT - 8,
                    right: 8,
                    fontSize: 10,
                    color: '#3f3f46',
                    fontVariantNumeric: 'tabular-nums',
                    userSelect: 'none',
                  }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Columns area */}
            <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
              {/* Hour grid lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  style={{
                    position: 'absolute',
                    top: (h - START_HOUR) * HOUR_HEIGHT,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'rgba(255,255,255,0.055)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              ))}
              {/* Half-hour lines */}
              {hours.slice(0, -1).map((h) => (
                <div
                  key={`half-${h}`}
                  style={{
                    position: 'absolute',
                    top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: 'rgba(255,255,255,0.022)',
                    pointerEvents: 'none',
                    zIndex: 0,
                  }}
                />
              ))}

              {/* Current time indicator */}
              {nowTop !== null && (
                <div
                  style={{
                    position: 'absolute',
                    top: nowTop,
                    left: 0,
                    right: 0,
                    height: 1,
                    background: '#ef4444',
                    zIndex: 3,
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: -3,
                      top: -3,
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: '#ef4444',
                      boxShadow: '0 0 6px rgba(239,68,68,0.7)',
                    }}
                  />
                </div>
              )}

              {/* Day columns */}
              {weekDays.map((d) => (
                <DayColumn
                  key={d.toISOString()}
                  date={d}
                  appointments={apptsByDay.get(d.toDateString()) ?? []}
                  onSlotClick={onSlotClick}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeAppt && <BlockGhost appointment={activeAppt} />}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
