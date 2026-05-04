import { useState } from 'react'
import { supabase } from '../lib/supabase'

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

const todayLocalISO = () => {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

const EMPTY = { patient_name: '', phone: '', appointment_datetime: todayLocalISO(), visit_type: VISIT_TYPES[0] }

export default function AppointmentForm({ onAdded }) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.from('appointments').insert({
      patient_name: form.patient_name.trim(),
      phone: form.phone.trim(),
      appointment_datetime: new Date(form.appointment_datetime).toISOString(),
      visit_type: form.visit_type,
      status: 'pending',
    })

    setLoading(false)
    if (err) {
      setError('Błąd zapisu: ' + err.message)
      return
    }
    setForm(EMPTY)
    onAdded?.()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="card p-6"
      style={{ borderTop: '1px solid rgba(59, 130, 246, 0.3)' }}
    >
      <div className="flex items-center gap-2 mb-5">
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#3b82f6',
            boxShadow: '0 0 8px rgba(59,130,246,0.8)',
          }}
        />
        <h2 className="text-sm font-semibold tracking-wide" style={{ color: '#e4e4e7' }}>
          Nowa wizyta
        </h2>
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
            <div className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center">
              <svg className="w-3.5 h-3.5" style={{ color: '#52525b' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <p
          className="text-xs mt-4 px-3 py-2 rounded-lg"
          style={{
            color: '#f87171',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.15)',
          }}
        >
          {error}
        </p>
      )}

      <div className="mt-5">
        <button
          type="submit"
          disabled={loading}
          className="btn-primary px-6 py-2.5"
        >
          {loading ? 'Zapisywanie…' : 'Dodaj wizytę'}
        </button>
      </div>
    </form>
  )
}
