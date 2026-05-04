import AppointmentForm from './AppointmentForm'

export default function AppointmentModal({ initialDateTime, onClose, onAdded }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        <AppointmentForm
          initialDateTime={initialDateTime}
          onAdded={onAdded}
          onCancel={onClose}
        />
      </div>
    </div>
  )
}
