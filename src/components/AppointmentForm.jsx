import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import IntakeSharePanel from './IntakeSharePanel'

const VISIT_TYPES = [
  'Kontrola',
  'Leczenie kanałowe',
  'Wybielanie',
  'Plombowanie',
  'Ekstrakcja',
  'Czyszczenie (scaling)',
  'Konsultacja',
  'RTG',
  'Korona / most',
  'Inne',
]

const DURATION_OPTIONS = [
  { value: 15,  label: '15 min'     },
  { value: 30,  label: '30 min'     },
  { value: 45,  label: '45 min'     },
  { value: 60,  label: '1 godz.'    },
  { value: 90,  label: '1:30 godz.' },
  { value: 120, label: '2 godz.'    },
]

function toLocalISO(date) {
  const d = new Date(date)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

function makeEmpty(initialDateTime) {
  return {
    patient_name: '',
    phone: '',
    appointment_datetime: initialDateTime ? toLocalISO(initialDateTime) : toLocalISO(new Date()),
    visit_type: VISIT_TYPES[0],
    duration_minutes: 30,
    doctor_id: '',
    notes: '',
  }
}

function SelectChevron() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
      <svg className="w-3.5 h-3.5" style={{ color: '#52525b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  )
}

export default function AppointmentForm({ initialDateTime, onAdded, onCancel }) {
  const { role, user } = useAuth()
  const [form, setForm] = useState(() => makeEmpty(initialDateTime))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [createdAppt, setCreatedAppt] = useState(null)

  const isDoctor = role === 'doctor'
  const canSeeMedical = role === 'admin' || role === 'doctor'

  // Fetch doctors for the assignment dropdown (admin/receptionist only)
  useEffect(() => {
    if (isDoctor) return
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'doctor')
      .eq('active', true)
      .order('full_name')
      .then(({ data }) => setDoctors(data ?? []))
  }, [isDoctor])

  // Pre-set doctor_id for doctor role
  useEffect(() => {
    if (isDoctor && user) {
      setForm((f) => ({ ...f, doctor_id: user.id }))
    }
  }, [isDoctor, user])

  const set = (field) => (e) => {
    const val = field === 'duration_minutes' ? Number(e.target.value) : e.target.value
    setForm((f) => ({ ...f, [field]: val }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      patient_name:         form.patient_name.trim(),
      phone:                form.phone.trim(),
      appointment_datetime: new Date(form.appointment_datetime).toISOString(),
      visit_type:           form.visit_type,
      duration_minutes:     form.duration_minutes,
      status:               'pending',
      doctor_id:            form.doctor_id || null,
      notes:                canSeeMedical && form.notes.trim() ? form.notes.trim() : null,
    }

    const { data, error: err } = await supabase
      .from('appointments')
      .insert(payload)
      .select('id')
      .single()

    setLoading(false)
    if (err) {
      setError('Błąd zapisu: ' + err.message)
      return
    }
    setCreatedAppt({ id: data.id, phone: form.phone.trim() })
  }

  if (createdAppt) {
    return (
      <IntakeSharePanel
        appointmentId={createdAppt.id}
        phone={createdAppt.phone}
        onClose={() => { setCreatedAppt(null); onAdded?.() }}
      />
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card p-6"
      style={{ borderTop: '1px solid rgba(59, 130, 246, 0.3)' }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px rgba(59,130,246,0.8)' }} />
          <h2 className="text-sm font-semibold tracking-wide" style={{ color: '#e4e4e7' }}>Nowa wizyta</h2>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs transition-colors"
            style={{ color: '#52525b' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#a1a1aa' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#52525b' }}
          >
            ✕ Anuluj
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
            Imię i nazwisko
          </label>
          <input
            required
            value={form.patient_name}
            onChange={set('patient_name')}
            placeholder="Jan Kowalski"
            className="input-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
            Telefon
          </label>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+48 600 000 000"
            className="input-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
            Data i godzina
          </label>
          <input
            required
            type="datetime-local"
            value={form.appointment_datetime}
            onChange={set('appointment_datetime')}
            className="input-dark"
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
            Czas trwania
          </label>
          <div className="relative">
            <select
              value={form.duration_minutes}
              onChange={set('duration_minutes')}
              className="input-dark appearance-none pr-8 cursor-pointer"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>

        <div className={doctors.length > 0 || isDoctor ? '' : 'sm:col-span-2'}>
          <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
            Rodzaj wizyty
          </label>
          <div className="relative">
            <select
              value={form.visit_type}
              onChange={set('visit_type')}
              className="input-dark appearance-none pr-8 cursor-pointer"
            >
              {VISIT_TYPES.map((vt) => (
                <option key={vt} value={vt}>{vt}</option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>

        {/* Doctor assignment — admin/receptionist only */}
        {!isDoctor && (
          <div>
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
              Przypisz lekarza
            </label>
            <div className="relative">
              <select
                value={form.doctor_id}
                onChange={set('doctor_id')}
                className="input-dark appearance-none pr-8 cursor-pointer"
              >
                <option value="">— brak przypisania —</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.full_name || d.id}</option>
                ))}
              </select>
              <SelectChevron />
            </div>
          </div>
        )}

        {/* Medical notes — admin/doctor only */}
        {canSeeMedical && (
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium mb-1.5 tracking-wide" style={{ color: '#52525b' }}>
              Notatki medyczne
            </label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              placeholder="Uwagi, obserwacje kliniczne…"
              rows={3}
              className="input-dark resize-none"
              style={{ lineHeight: 1.5 }}
            />
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs mt-4 px-3 py-2 rounded-lg" style={{
          color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)',
        }}>
          {error}
        </p>
      )}

      <div className="mt-5">
        <button type="submit" disabled={loading} className="btn-primary px-6 py-2.5">
          {loading ? 'Zapisywanie…' : 'Dodaj wizytę'}
        </button>
      </div>
    </form>
  )
}
