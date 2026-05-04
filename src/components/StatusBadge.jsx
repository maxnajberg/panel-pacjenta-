const STATUS_CONFIG = {
  pending: {
    label: 'Oczekuje',
    style: {
      background: 'rgba(234, 179, 8, 0.09)',
      color: '#facc15',
      border: '1px solid rgba(234, 179, 8, 0.22)',
      boxShadow: '0 0 10px rgba(234, 179, 8, 0.14)',
    },
  },
  confirmed: {
    label: 'Potwierdzona',
    style: {
      background: 'rgba(74, 222, 128, 0.08)',
      color: '#4ade80',
      border: '1px solid rgba(74, 222, 128, 0.22)',
      boxShadow: '0 0 10px rgba(74, 222, 128, 0.18)',
    },
  },
  cancelled: {
    label: 'Anulowana',
    style: {
      background: 'rgba(248, 113, 113, 0.08)',
      color: '#f87171',
      border: '1px solid rgba(248, 113, 113, 0.22)',
      boxShadow: '0 0 10px rgba(248, 113, 113, 0.14)',
    },
  },
  no_response: {
    label: 'Brak odpowiedzi',
    style: {
      background: 'rgba(113, 113, 122, 0.1)',
      color: '#71717a',
      border: '1px solid rgba(113, 113, 122, 0.15)',
    },
  },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span
      style={config.style}
      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
    >
      {config.label}
    </span>
  )
}
