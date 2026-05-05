import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const inputBase = {
  width: '100%',
  background: '#16161e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#e4e4e7',
  fontSize: 14,
  fontFamily: 'Inter, system-ui, sans-serif',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

function Input({ value, onChange, type = 'text', placeholder, required }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      style={inputBase}
      onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

function Textarea({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={3}
      style={{ ...inputBase, resize: 'vertical', lineHeight: 1.6 }}
      onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)' }}
      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#71717a', marginBottom: hint ? 2 : 6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </label>
      {hint && (
        <p style={{ fontSize: 11, color: '#52525b', margin: '0 0 8px', lineHeight: 1.4 }}>{hint}</p>
      )}
      {children}
    </div>
  )
}

function SectionCard({ number, title, children }) {
  return (
    <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#60a5fa',
        }}>
          {number}
        </div>
        <h2 style={{ fontSize: 13, fontWeight: 600, color: '#d4d4d8', margin: 0, letterSpacing: '0.02em' }}>
          {title}
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {children}
      </div>
    </div>
  )
}

function CheckboxGroup({ options, selected, onToggle, otherValue, onOtherChange, otherPlaceholder }) {
  const hasOther = selected.some(v => v.startsWith('Inne'))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            style={{ width: 16, height: 16, accentColor: '#3b82f6', cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: '#d4d4d8', lineHeight: 1.4 }}>{opt}</span>
        </label>
      ))}
      {hasOther && (
        <div style={{ marginTop: 2, paddingLeft: 26 }}>
          <Input
            value={otherValue}
            onChange={e => onOtherChange(e.target.value)}
            placeholder={otherPlaceholder || 'Podaj szczegóły…'}
          />
        </div>
      )}
    </div>
  )
}

function RadioGroup({ name, options, selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map(opt => (
        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input
            type="radio"
            name={name}
            value={opt}
            checked={selected === opt}
            onChange={() => onSelect(opt)}
            style={{ width: 16, height: 16, accentColor: '#3b82f6', cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: '#d4d4d8' }}>{opt}</span>
        </label>
      ))}
    </div>
  )
}

function formatDateTimePL(iso) {
  return new Date(iso).toLocaleString('pl-PL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const ALLERGIES = [
  'Penicylina',
  'Lateks',
  'Środki znieczulające (lidokaina)',
  'Aspiryna / NLPZ',
  'Jod',
  'Inne',
]

const CHRONIC_CONDITIONS = [
  'Cukrzyca',
  'Nadciśnienie',
  'Choroby serca',
  'Astma',
  'Epilepsja',
  'Przyjmuję leki rozrzedzające krew',
  'Inne',
]

const INFECTIOUS_DISEASES = [
  'HIV / AIDS',
  'WZW typu B (HBV)',
  'WZW typu C (HCV)',
  'Gruźlica',
  'Inne choroby zakaźne',
]

const DENTAL_VISIT_OPTIONS = [
  'Mniej niż 6 miesięcy',
  '6–12 miesięcy',
  '1–2 lata',
  'Ponad 2 lata',
  'Nie pamiętam',
]

const EMPTY = {
  first_name: '', last_name: '', pesel: '', date_of_birth: '', address: '',
  phone: '', email: '',
  allergies_list: [],
  allergies_other: '',
  medications: '',
  chronic_conditions_list: [],
  chronic_conditions_other: '',
  infectious_diseases: [],
  infectious_diseases_other: '',
  last_dental_visit_choice: '',
  rodo_consent: false,
}

export default function IntakeForm() {
  const { appointmentId } = useParams()
  const [appointment, setAppointment] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [alreadySubmitted, setAlreadySubmitted] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('appointments')
      .select('id, patient_name, appointment_datetime, visit_type, patient_id')
      .eq('id', appointmentId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err || !data) { setNotFound(true); return }
        setAppointment(data)
        if (data.patient_id) setAlreadySubmitted(true)
      })
  }, [appointmentId])

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((f) => ({ ...f, [field]: val }))
  }

  const toggleItem = (field, item) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(item)
        ? f[field].filter(v => v !== item)
        : [...f[field], item],
    }))
  }

  const setField = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: err } = await supabase.rpc('submit_intake_form', {
      p_appointment_id:            appointmentId,
      p_first_name:                form.first_name.trim(),
      p_last_name:                 form.last_name.trim(),
      p_pesel:                     form.pesel.trim() || null,
      p_date_of_birth:             form.date_of_birth || null,
      p_address:                   form.address.trim() || null,
      p_phone:                     form.phone.trim() || null,
      p_email:                     form.email.trim() || null,
      p_allergies_list:            form.allergies_list,
      p_allergies_other:           form.allergies_other.trim() || null,
      p_medications:               form.medications.trim() || null,
      p_chronic_conditions_list:   form.chronic_conditions_list,
      p_chronic_conditions_other:  form.chronic_conditions_other.trim() || null,
      p_infectious_diseases:       form.infectious_diseases,
      p_infectious_diseases_other: form.infectious_diseases_other.trim() || null,
      p_last_dental_visit_choice:  form.last_dental_visit_choice || null,
      p_rodo_consent:              form.rodo_consent,
    })

    setLoading(false)
    if (err) { setError('Błąd zapisu: ' + err.message); return }
    setDone(true)
  }

  if (notFound) {
    return (
      <Screen>
        <div style={{ textAlign: 'center', color: '#52525b' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
          <p style={{ fontSize: 14, margin: 0 }}>Link jest nieprawidłowy lub wizyta nie istnieje.</p>
        </div>
      </Screen>
    )
  }

  if (!appointment) {
    return (
      <Screen>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(59,130,246,0.4)', borderTopColor: '#3b82f6', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </Screen>
    )
  }

  if (done) {
    return (
      <Screen>
        <div style={{ textAlign: 'center', maxWidth: 300 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
            background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, color: '#4ade80',
          }}>✓</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#e4e4e7', margin: '0 0 10px' }}>Dziękujemy!</h1>
          <p style={{ fontSize: 14, color: '#71717a', lineHeight: 1.6, margin: 0 }}>
            Formularz został wysłany. Do zobaczenia na wizycie.
          </p>
        </div>
      </Screen>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', padding: '28px 16px 64px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, margin: '0 auto 12px',
            background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem',
          }}>🦷</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#e4e4e7', margin: '0 0 6px' }}>
            Formularz pacjenta
          </h1>
          <p style={{ fontSize: 12, color: '#52525b', margin: 0 }}>
            {appointment.visit_type} · {formatDateTimePL(appointment.appointment_datetime)}
          </p>
        </div>

        {alreadySubmitted && (
          <div style={{
            background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.2)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 20,
            fontSize: 12, color: '#fbbf24', lineHeight: 1.5,
          }}>
            Formularz był już wypełniony. Możesz zaktualizować swoje dane poniżej.
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          <SectionCard number={1} title="Dane osobowe">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Imię *">
                <Input required value={form.first_name} onChange={set('first_name')} placeholder="Jan" />
              </Field>
              <Field label="Nazwisko *">
                <Input required value={form.last_name} onChange={set('last_name')} placeholder="Kowalski" />
              </Field>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="PESEL">
                <Input value={form.pesel} onChange={set('pesel')} placeholder="00000000000" />
              </Field>
              <Field label="Data urodzenia">
                <Input type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
              </Field>
            </div>
            <Field label="Adres zamieszkania">
              <Input value={form.address} onChange={set('address')} placeholder="ul. Przykładowa 1, 00-000 Warszawa" />
            </Field>
          </SectionCard>

          <SectionCard number={2} title="Dane kontaktowe">
            <Field label="Telefon">
              <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="+48 600 000 000" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={set('email')} placeholder="jan@example.com" />
            </Field>
          </SectionCard>

          <SectionCard number={3} title="Historia medyczna">
            <Field label="Alergie" hint="Zaznacz wszystkie, które dotyczą">
              <CheckboxGroup
                options={ALLERGIES}
                selected={form.allergies_list}
                onToggle={item => toggleItem('allergies_list', item)}
                otherValue={form.allergies_other}
                onOtherChange={v => setField('allergies_other', v)}
                otherPlaceholder="Opisz alergie…"
              />
            </Field>

            <Field label="Choroby przewlekłe" hint="Zaznacz wszystkie, które dotyczą">
              <CheckboxGroup
                options={CHRONIC_CONDITIONS}
                selected={form.chronic_conditions_list}
                onToggle={item => toggleItem('chronic_conditions_list', item)}
                otherValue={form.chronic_conditions_other}
                onOtherChange={v => setField('chronic_conditions_other', v)}
                otherPlaceholder="Opisz choroby…"
              />
            </Field>

            <Field label="Choroby zakaźne" hint="Zaznacz wszystkie, które dotyczą — dane widoczne wyłącznie dla lekarza">
              <CheckboxGroup
                options={INFECTIOUS_DISEASES}
                selected={form.infectious_diseases}
                onToggle={item => toggleItem('infectious_diseases', item)}
                otherValue={form.infectious_diseases_other}
                onOtherChange={v => setField('infectious_diseases_other', v)}
                otherPlaceholder="Opisz choroby zakaźne…"
              />
            </Field>

            <Field label="Przyjmowane leki">
              <Textarea value={form.medications} onChange={set('medications')} placeholder="Nazwy leków i dawkowanie" />
            </Field>

            <Field label="Ostatnia wizyta u dentysty">
              <RadioGroup
                name="last_dental_visit"
                options={DENTAL_VISIT_OPTIONS}
                selected={form.last_dental_visit_choice}
                onSelect={v => setField('last_dental_visit_choice', v)}
              />
            </Field>
          </SectionCard>

          <SectionCard number={4} title="Zgoda RODO">
            <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                required
                checked={form.rodo_consent}
                onChange={set('rodo_consent')}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: '#3b82f6', flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 12, color: '#71717a', lineHeight: 1.65 }}>
                Wyrażam zgodę na przetwarzanie moich danych osobowych, w tym danych dotyczących
                zdrowia, przez klinikę dentystyczną w celu udzielenia świadczeń zdrowotnych, zgodnie
                z RODO (Rozporządzenie Parlamentu Europejskiego i Rady (UE) 2016/679). <span style={{ color: '#f87171' }}>*</span>
              </span>
            </label>
          </SectionCard>

          {error && (
            <p style={{
              fontSize: 13, color: '#f87171', margin: 0,
              background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)',
              borderRadius: 8, padding: '10px 14px',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !form.rodo_consent}
            style={{
              padding: 14, borderRadius: 10, border: 'none',
              background: form.rodo_consent ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.05)',
              color: form.rodo_consent ? '#fff' : '#52525b',
              fontSize: 14, fontWeight: 600, cursor: form.rodo_consent && !loading ? 'pointer' : 'not-allowed',
              fontFamily: 'Inter, system-ui, sans-serif',
              opacity: loading ? 0.7 : 1,
              transition: 'all 0.2s',
              boxShadow: form.rodo_consent ? '0 4px 20px rgba(59,130,246,0.25)' : 'none',
            }}
          >
            {loading ? 'Wysyłanie…' : 'Wyślij formularz'}
          </button>

        </form>
      </div>
    </div>
  )
}

function Screen({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      {children}
    </div>
  )
}
