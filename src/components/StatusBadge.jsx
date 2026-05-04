const STATUS_CONFIG = {
  pending: {
    label: 'Oczekuje',
    classes: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  },
  confirmed: {
    label: 'Potwierdzona',
    classes: 'bg-green-100 text-green-800 border border-green-200',
  },
  cancelled: {
    label: 'Anulowana',
    classes: 'bg-red-100 text-red-800 border border-red-200',
  },
  no_response: {
    label: 'Brak odpowiedzi',
    classes: 'bg-gray-100 text-gray-600 border border-gray-200',
  },
}

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${config.classes}`}>
      {config.label}
    </span>
  )
}
