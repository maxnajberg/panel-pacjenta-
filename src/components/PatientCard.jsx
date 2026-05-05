import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function PatientCard({ appointment, patient, onClose, role }) {
  const [infectiousDiseases, setInfectiousDiseases] = useState(null)

  useEffect(() => {
    if (!patient?.id || !['doctor', 'admin'].includes(role)) return
    supabase
      .from('patient_infectious_diseases')
      .select('diseases, diseases_other')
      .eq('patient_id', patient.id)
      .maybeSingle()
      .then(({ data }) => setInfectiousDiseases(data))
  }, [patient?.id, role])

  const formatDate = (iso) => {
    if (!iso) return null
    return new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  // Support both new array fields and legacy text fields
  const allergyItems = patient?.allergies_list?.length > 0 ? patient.allergies_list : null
  const allergyLegacy = patient?.allergies?.trim() || null
  const hasAllergies = allergyItems || allergyLegacy || patient?.allergies_other

  const conditionItems = patient?.chronic_conditions_list?.length > 0 ? patient.chronic_conditions_list : null
  const conditionLegacy = patient?.chronic_conditions?.trim() || null

  const hasInfectious = infectiousDiseases?.diseases?.length > 0 || infectiousDiseases?.diseases_other

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
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#f87171', margin: '0 0 6px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Alergie
                  </p>
                  {allergyItems ? (
                    <>
                      <TagList items={allergyItems} color="red" />
                      {patient.allergies_other && (
                        <p style={{ fontSize: 12, color: '#fca5a5', margin: '6px 0 0', lineHeight: 1.5 }}>{patient.allergies_other}</p>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: 13, color: '#fca5a5', margin: 0, lineHeight: 1.55 }}>{allergyLegacy}</p>
                  )}
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

            <MedicalSection
              conditionItems={conditionItems}
              conditionOther={patient.chronic_conditions_other}
              conditionLegacy={conditionLegacy}
              medications={patient.medications}
              lastVisit={patient.last_dental_visit_choice || patient.last_dental_visit}
            />

            {/* Infectious diseases — doctor and admin only */}
            {['doctor', 'admin'].includes(role) && hasInfectious && (
              <div>
                <SectionLabel>Choroby zakaźne</SectionLabel>
                <div style={{
                  background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.2)',
                  borderRadius: 10, padding: '12px 16px',
                }}>
                  <TagList items={infectiousDiseases.diseases} color="orange" />
                  {infectiousDiseases.diseases_other && (
                    <p style={{ fontSize: 12, color: '#fdba74', margin: '6px 0 0', lineHeight: 1.5 }}>
                      {infectiousDiseases.diseases_other}
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

function MedicalSection({ conditionItems, conditionOther, conditionLegacy, medications, lastVisit }) {
  const hasConditions = conditionItems || conditionLegacy || conditionOther
  const hasMeds = medications?.trim()
  const hasVisit = lastVisit?.trim()
  if (!hasConditions && !hasMeds && !hasVisit) return null

  return (
    <div>
      <SectionLabel>Historia medyczna</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {hasConditions && (
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: '#52525b', minWidth: 120, flexShrink: 0, paddingTop: 2 }}>Choroby przewlekłe</span>
            <div style={{ minWidth: 0 }}>
              {conditionItems ? (
                <>
                  <TagList items={conditionItems} />
                  {conditionOther && (
                    <p style={{ fontSize: 12, color: '#a1a1aa', margin: '5px 0 0', lineHeight: 1.5 }}>{conditionOther}</p>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 13, color: '#d4d4d8', lineHeight: 1.55 }}>{conditionLegacy}</span>
              )}
            </div>
          </div>
        )}
        {hasMeds && <DataRow label="Leki" value={medications} multiline />}
        {hasVisit && <DataRow label="Ostatnia wizyta" value={lastVisit} />}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, color: '#3f3f46',
      letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px',
    }}>
      {children}
    </p>
  )
}

function TagList({ items, color }) {
  if (!items?.length) return null
  const bg = color === 'red' ? 'rgba(248,113,113,0.12)' : color === 'orange' ? 'rgba(251,146,60,0.12)' : 'rgba(255,255,255,0.06)'
  const fg = color === 'red' ? '#fca5a5' : color === 'orange' ? '#fdba74' : '#a1a1aa'
  const border = color === 'red' ? 'rgba(248,113,113,0.2)' : color === 'orange' ? 'rgba(251,146,60,0.2)' : 'rgba(255,255,255,0.08)'
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {items.map(item => (
        <span key={item} style={{
          fontSize: 11, padding: '3px 8px', borderRadius: 6,
          background: bg, color: fg, border: `1px solid ${border}`,
          fontWeight: 500,
        }}>
          {item}
        </span>
      ))}
    </div>
  )
}

function DataSection({ title, children }) {
  const rows = Array.isArray(children) ? children : [children]
  const visibleRows = rows.filter(r => r?.props?.value)
  if (visibleRows.length === 0) return null
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
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
