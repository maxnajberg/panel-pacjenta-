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
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Nowa wizyta</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Imię i nazwisko</label>
          <input
            required
            value={form.patient_name}
            onChange={set('patient_name')}
            placeholder="Jan Kowalski"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
          <input
            required
            type="tel"
            value={form.phone}
            onChange={set('phone')}
            placeholder="+48 600 000 000"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Data i godzina</label>
          <input
            required
            type="datetime-local"
            value={form.appointment_datetime}
            onChange={set('appointment_datetime')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rodzaj wizyty</label>
          <select
            value={form.visit_type}
            onChange={set('visit_type')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {VISIT_TYPES.map((vt) => (
              <option key={vt} value={vt}>{vt}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg text-sm transition-colors"
      >
        {loading ? 'Zapisywanie…' : 'Dodaj wizytę'}
      </button>
    </form>
  )
}
