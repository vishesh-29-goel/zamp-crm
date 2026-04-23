export default function HealthBadge({ health }) {
  const map = {
    green:  { cls: 'badge-green',  label: '● Green'  },
    yellow: { cls: 'badge-yellow', label: '● Yellow' },
    red:    { cls: 'badge-red',    label: '● Red'    },
  }
  const { cls, label } = map[health] || { cls: 'badge-gray', label: health || '—' }
  return <span className={cls}>{label}</span>
}
