export default function PriorityBadge({ tags }) {
  const priority = Array.isArray(tags) ? tags.find(t => t === 'P0' || t === 'P1') : null
  if (!priority) return <span className="text-sm text-gray-400">—</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
      priority === 'P0'
        ? 'bg-red-50 text-red-600 border border-red-200'
        : 'bg-amber-50 text-amber-600 border border-amber-200'
    }`}>
      {priority}
    </span>
  )
}
