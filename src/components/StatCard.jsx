const COLOR_MAP = {
  'text-gray-900':   'text-gray-900',
  'text-zamp-600':   'text-zamp-600',
  'text-green-600':  'text-green-600',
  'text-red-600':    'text-red-600',
  'text-amber-600':  'text-amber-600',
}

export default function StatCard({ label, value, sub, color = 'text-gray-900', icon: Icon, iconColor }) {
  const textColor = COLOR_MAP[color] || 'text-gray-900'
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor || 'bg-surface-page text-gray-400'}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <p className={`text-3xl font-bold mt-2 ${textColor}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
