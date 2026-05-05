export default function PatientCard({ appointment, patient, onClose }) {
  const hasAllergies = patient?.allergies?.trim()

  const formatDate = (iso) => {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(7px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: 26, maxWidth: 480, width: '100%',
          maxHeight: '82vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e4e4e7', margin: '0 0 3px' }}>
              {patient ? `${patient.first_name} ${patient.last_name}` : appointment.patient_name}
            </h2>
            <p style={{ fontSize: 12, color: '#52525b', margin: 0 }}>
              {appointment.visit_type}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {!patient ? (
          <div style={{
            textAlign: 'center', padding: '44px 20px',
            border: '1px dashed rgba(255,255,255,0.07)', borderRadius: 12,
          }}>
            <div style={{ fontSize: 34, marginBottom: 12, opacity: 0.3 }}>📋</div>
            <p style={{ fontSize: 13, color: '#3f3f46', margin: 0 }}>Formularz nie został jeszcze wypełniony</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Allergy alert */}
            {hasAllergies && (
              <div style={{
                background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.25)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1.3 }}>⚠️</span>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#f87171', margin: '0 0 4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Alergie
                  </p>
                  <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, lineHeight: 1.55 }}>
                    {patient.allergies}
                  </p>
                </div>
              </div>
            )}

            <DataSection title="Dane osobowe">
              <DataRow label="PESEL" value={patient.pesel} />
              <DataRow label="Data urodzenia" value={formatDate(patient.date_of_birth)} />
              <DataRow label="Adres" value={patient.address} />
            </DataSection>

            <DataSection title="Kontakt">
              <DataRow label="Telefon" value={patient.phone} />
              <DataRow label="E-mail" value={patient.email} />
            </DataSection>

            <DataSection title="Historia medyczna">
              <DataRow label="Leki" value={patient.medications} multiline />
              <DataRow label="Choroby przewlekłe" value={patient.chronic_conditions} multiline />
              <DataRow label="Ostatnia wizyta" value={patient.last_dental_visit} />
            </DataSection>

          </div>
        )}
      </div>
    </div>
  )
}

function DataSection({ title, children }) {
  const rows = Array.isArray(children) ? children : [children]
  const visibleRows = rows.filter(r => r?.props?.value)
  if (visibleRows.length === 0) return null
  return (
    <div>
      <p style={{
        fontSize: 10, fontWeight: 700, color: '#3f3f46',
        letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px',
      }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {visibleRows}
      </div>
    </div>
  )
}

function DataRow({ label, value, multiline }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 16, alignItems: multiline ? 'flex-start' : 'center' }}>
      <span style={{ fontSize: 12, color: '#52525b', minWidth: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#d4d4d8', lineHeight: 1.55 }}>{value}</span>
    </div>
  )
}
