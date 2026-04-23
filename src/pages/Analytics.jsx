import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useClients } from '../lib/useApi'
import Spinner from '../components/Spinner'

function fmt(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n}`
}

const STAGE_COLORS = { live: '#22c55e', poc: '#4f6ef7', pilot: '#a78bfa', prospect: '#94a3b8', churned: '#e2e8f0' }
const HEALTH_COLORS = { green: '#22c55e', yellow: '#eab308', red: '#ef4444' }
const POD_COLORS = ['#4f6ef7','#22c55e','#f59e0b','#a78bfa','#94a3b8']

export default function Analytics() {
  const { data: clients = [], isLoading } = useClients()

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>

  // Stage distribution
  const stageData = ['live','poc','pilot','prospect','churned']
    .map(s => ({ name: s, value: clients.filter(c => c.stage === s).length }))
    .filter(d => d.value > 0)

  // Health distribution
  const healthData = ['green','yellow','red']
    .map(h => ({ name: h, value: clients.filter(c => c.health === h).length }))
    .filter(d => d.value > 0)

  // ARR by client (top 10)
  const arrData = [...clients]
    .filter(c => Number(c.arr) > 0)
    .sort((a, b) => Number(b.arr) - Number(a.arr))
    .slice(0, 10)
    .map(c => ({ name: c.name, arr: Number(c.arr) }))

  // ARR by pod — derived from clients (pod_name field), NOT from the pods API.
  // The pods endpoint can return inflated totals when the backend query fans out
  // rows due to multiple GM/ASM members per pod. Aggregating from the clients list
  // is always correct because each client row is unique and carries its own arr.
  const podArrMap = clients.reduce((acc, c) => {
    if (!c.pod_name || !Number(c.arr)) return acc
    acc[c.pod_name] = acc[c.pod_name] || { name: c.pod_name, arr: 0, clients: 0 }
    acc[c.pod_name].arr     += Number(c.arr)
    acc[c.pod_name].clients += 1
    return acc
  }, {})
  const arrByPod = Object.values(podArrMap).filter(p => p.arr > 0)

  // totalARR and podSumARR now share the same source — clients — so they will
  // always be consistent (podSumARR ≤ totalARR, difference = unassigned clients).
  const totalARR  = clients.reduce((s, c) => s + (Number(c.arr) || 0), 0)
  const podSumARR = arrByPod.reduce((s, p) => s + p.arr, 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Portfolio overview · {clients.length} clients · {fmt(totalARR)} total ARR</p>
        {podSumARR > 0 && podSumARR !== totalARR && (
          <p className="text-xs text-amber-500 mt-0.5">⚠ Pod sum ({fmt(podSumARR)}) differs from total — some clients may be unassigned to a pod</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Stage breakdown */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-5">Clients by Stage</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stageData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                {stageData.map((d, i) => <Cell key={i} fill={STAGE_COLORS[d.name] || '#94a3b8'} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Health breakdown */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-5">Clients by Health</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={healthData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name} (${value})`}>
                {healthData.map((d, i) => <Cell key={i} fill={HEALTH_COLORS[d.name] || '#94a3b8'} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ARR by client */}
      {arrData.length > 0 && (
        <div className="card mb-6">
          <h2 className="font-semibold text-gray-900 mb-5">ARR by Client (Top {arrData.length})</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={arrData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v/1000}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={48} />
              <Tooltip formatter={v => [fmt(v), 'ARR']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="arr" radius={[4,4,0,0]} fill="#4f6ef7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ARR by pod */}
      {arrByPod.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-5">ARR by Pod</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {arrByPod.map((p, i) => (
              <div key={p.name} className="text-center p-4 rounded-xl border border-gray-100" style={{ borderTopColor: POD_COLORS[i], borderTopWidth: 3 }}>
                <p className="text-sm font-semibold text-gray-700">{p.name}</p>
                <p className="text-xl font-bold mt-1" style={{ color: POD_COLORS[i] }}>{fmt(p.arr)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{p.clients} clients</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
