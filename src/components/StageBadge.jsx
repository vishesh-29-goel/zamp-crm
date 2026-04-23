export default function StageBadge({ stage }) {
  const map = {
    live:     'badge-green',
    poc:      'badge-blue',
    pilot:    'badge-blue',
    prospect: 'badge-gray',
    churned:  'badge-gray',
  }
  const cls = map[stage] || 'badge-gray'
  return <span className={`${cls} capitalize`}>{stage || '—'}</span>
}
