import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePods, usePodClients, useClients, useZampians, useCreatePod, useUpdatePod } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import Spinner from '../components/Spinner'
import HealthBadge from '../components/HealthBadge'
import StageBadge from '../components/StageBadge'
import {
  Users, Zap, ChevronRight, TrendingUp, AlertTriangle,
  Plus, Pencil, X, Check, Building2
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtARR(n) {
  if (!n || n === 0) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`
  return `$${n}`
}

// ─── Health bar with legend tooltip ──────────────────────────────────────────

function HealthBar({ green = 0, yellow = 0, red = 0 }) {
  const total = green + yellow + red
  if (total === 0) return <div className="h-1.5 w-full rounded-full bg-gray-100" />
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-full overflow-hidden h-1.5 flex-1 bg-gray-100 min-w-0">
        {red    > 0 && <div className="bg-red-400 transition-all"    style={{ width: `${(red    / total) * 100}%` }} />}
        {yellow > 0 && <div className="bg-amber-400 transition-all"  style={{ width: `${(yellow / total) * 100}%` }} />}
        {green  > 0 && <div className="bg-green-400 transition-all"  style={{ width: `${(green  / total) * 100}%` }} />}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {green  > 0 && <span className="text-[10px] font-semibold text-green-600">{green}G</span>}
        {yellow > 0 && <span className="text-[10px] font-semibold text-amber-500">{yellow}Y</span>}
        {red    > 0 && <span className="text-[10px] font-semibold text-red-500">{red}R</span>}
      </div>
    </div>
  )
}

// ─── Pod edit modal ───────────────────────────────────────────────────────────

function PodModal({ pod, zampians, onClose, onSave, isSaving }) {
  const isNew = !pod
  const [name, setName]     = useState(pod?.name || '')
  const [gmId, setGmId]     = useState(pod?.gm_zampian_id || '')
  const [asmId, setAsmId]   = useState(pod?.asm_zampian_id || '')

  const gms  = zampians.filter(z => ['GM', 'CEO', 'SUPERADMIN'].includes(z.role))
  const asms = zampians.filter(z => ['ASM', 'GM', 'CEO', 'SUPERADMIN'].includes(z.role))

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    onSave({
      ...(pod ? { id: pod.id } : {}),
      name: name.trim(),
      gm_zampian_id:  gmId  ? Number(gmId)  : undefined,
      asm_zampian_id: asmId ? Number(asmId) : undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-gray-900">
            {isNew ? 'Create pod' : `Edit ${pod.name}`}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pod name</label>
            <input
              className="w-full text-sm border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-400 focus:border-transparent transition"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Revenue Pod 4"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">GM (General Manager)</label>
            <select
              className="w-full text-sm border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-400 focus:border-transparent transition bg-white"
              value={gmId}
              onChange={e => setGmId(e.target.value)}
            >
              <option value="">— unassigned —</option>
              {gms.map(z => <option key={z.id} value={z.id}>{z.name} ({z.role})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">ASM (Account Success Manager)</label>
            <select
              className="w-full text-sm border border-border-subtle rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-400 focus:border-transparent transition bg-white"
              value={asmId}
              onChange={e => setAsmId(e.target.value)}
            >
              <option value="">— unassigned —</option>
              {asms.map(z => <option key={z.id} value={z.id}>{z.name} ({z.role})</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isSaving || !name.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-zamp-600 hover:bg-zamp-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-2">
              {isSaving ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
              {isNew ? 'Create pod' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Client row ───────────────────────────────────────────────────────────────

function ClientRow({ client }) {
  return (
    <Link
      to={`/clients/${client.id}`}
      className="flex items-center gap-3 px-5 py-3 hover:bg-surface-page transition-colors group border-t border-border-subtle first:border-t-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate group-hover:text-zamp-600 transition-colors">
            {client.name}
          </span>
          {client.open_tasks_count > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 flex-shrink-0">
              <Zap className="w-2.5 h-2.5" />{client.open_tasks_count}
            </span>
          )}
        </div>
        {client.industry && (
          <p className="text-xs text-gray-400 truncate mt-0.5">{client.industry}</p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <StageBadge stage={client.stage} />
        <HealthBadge health={client.health} />
        {Number(client.arr) > 0 && (
          <span className="text-xs font-semibold text-gray-600 w-14 text-right tabular-nums">
            {fmtARR(Number(client.arr))}
          </span>
        )}
        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400" />
      </div>
    </Link>
  )
}

// ─── Pod card ─────────────────────────────────────────────────────────────────

function PodCard({ pod, podStats, canEdit, onEdit, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)
  const { data: clients = [], isLoading } = usePodClients(open ? pod.id : null)

  const stats = podStats[pod.id] || { arr: 0, clients: 0, green: 0, yellow: 0, red: 0 }
  const greenPct = stats.clients > 0 ? Math.round((stats.green / stats.clients) * 100) : 0
  const healthColor = greenPct >= 70 ? 'text-green-600' : greenPct >= 40 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="card overflow-hidden p-0">
      {/* Header row */}
      <div className="flex items-center">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 flex items-center gap-4 px-5 py-4 hover:bg-surface-page transition-colors text-left min-w-0"
        >
          {/* Icon + name */}
          <div className="w-9 h-9 rounded-xl bg-zamp-50 border border-zamp-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-4 h-4 text-zamp-600" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900 truncate">{pod.name}</h2>
              {stats.red > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full border border-red-200 flex-shrink-0">
                  <AlertTriangle className="w-2.5 h-2.5" />{stats.red}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {pod.gm_name  && <span className="text-xs text-gray-400">GM: <span className="font-medium text-gray-600">{pod.gm_name}</span></span>}
              {pod.asm_name && <span className="text-xs text-gray-400 before:content-['·'] before:mx-1.5">ASM: <span className="font-medium text-gray-600">{pod.asm_name}</span></span>}
              {!pod.gm_name && !pod.asm_name && <span className="text-xs text-gray-300 italic">No leads assigned</span>}
            </div>
            <div className="mt-2.5">
              <HealthBar green={stats.green} yellow={stats.yellow} red={stats.red} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 flex-shrink-0">
            <div className="text-center hidden sm:block">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Clients</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{stats.clients}</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">ARR</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{fmtARR(stats.arr)}</p>
            </div>
            <div className="text-center hidden md:block">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Health</p>
              <p className={`text-xl font-bold tabular-nums ${healthColor}`}>{greenPct}%</p>
            </div>
            <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
          </div>
        </button>

        {canEdit && (
          <button
            onClick={e => { e.stopPropagation(); onEdit(pod) }}
            className="px-3 self-stretch flex items-center border-l border-border-subtle hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Client list */}
      {open && (
        <div className="border-t border-border-subtle">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-8 text-center">
              <Building2 className="w-6 h-6 text-gray-200" />
              <p className="text-sm text-gray-400">No clients assigned to this pod</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {clients.map(c => <ClientRow key={c.id} client={c} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Pods() {
  const { role, user } = useAuth()
  const { data: pods = [],     isLoading: podsLoading  } = usePods()
  const { data: clients = [],  isLoading: clientsLoading } = useClients()
  const { data: zampians = [] }                           = useZampians()
  const createPod = useCreatePod()
  const updatePod = useUpdatePod()

  const [modal, setModal] = useState(null) // null | { pod } | { pod: null } for create

  const canManage = ['SUPERADMIN', 'CEO', 'GM'].includes(role)
  const canCreate = ['SUPERADMIN', 'CEO'].includes(role)

  // ── Derive all pod stats from clients (canonical, inflation-free) ──────────
  const podStats = useMemo(() => {
    const map = {}
    for (const pod of pods) {
      map[pod.id] = { arr: 0, clients: 0, green: 0, yellow: 0, red: 0 }
    }
    for (const c of clients) {
      if (!c.pod_id || !map[c.pod_id]) continue
      const s = map[c.pod_id]
      s.clients += 1
      s.arr     += Number(c.arr) || 0
      if (c.health === 'green')  s.green  += 1
      if (c.health === 'yellow') s.yellow += 1
      if (c.health === 'red')    s.red    += 1
    }
    return map
  }, [pods, clients])

  const unassignedClients = useMemo(
    () => clients.filter(c => !c.pod_id),
    [clients]
  )

  // ── Summary totals from clients ────────────────────────────────────────────
  const totalARR     = clients.reduce((s, c) => s + (Number(c.arr) || 0), 0)
  const totalClients = clients.length
  const totalRed     = clients.filter(c => c.health === 'red').length
  const totalSignals = pods.reduce((s, p) => s + (p.open_signals || 0), 0)

  // ── Modal handlers ─────────────────────────────────────────────────────────
  async function handleSave(data) {
    try {
      if (data.id) {
        await updatePod.mutateAsync(data)
      } else {
        await createPod.mutateAsync(data)
      }
      setModal(null)
    } catch (err) {
      console.error(err)
    }
  }

  // ── Sort pods: user's own pod first, then most at-risk ─────────────────────
  const userPodId = user?.zampian?.pod_id ?? null
  const sortedPods = useMemo(() => {
    return [...pods].sort((a, b) => {
      // Pin the user's own pod to the top
      const aOwn = String(a.id) === String(userPodId) ? -1 : 0
      const bOwn = String(b.id) === String(userPodId) ? -1 : 0
      if (aOwn !== bOwn) return aOwn - bOwn
      // Then sort remaining pods by risk (red × 3 + yellow), highest first
      const sA = podStats[a.id] || {}
      const sB = podStats[b.id] || {}
      const riskA = (sA.red || 0) * 3 + (sA.yellow || 0)
      const riskB = (sB.red || 0) * 3 + (sB.yellow || 0)
      return riskB - riskA || a.name.localeCompare(b.name)
    })
  }, [pods, podStats, userPodId])

  if (podsLoading || clientsLoading) {
    return <div className="flex items-center justify-center h-96"><Spinner /></div>
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pod Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pods.length} pods · {totalClients} clients · {fmtARR(totalARR)} total ARR
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => setModal({ pod: null })}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-zamp-600 hover:bg-zamp-700 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            New pod
          </button>
        )}
      </div>

      {/* ── Summary strip ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Total clients', value: totalClients,        color: 'text-zamp-600',  border: 'border-t-zamp-400',  icon: <Users       className="w-3 h-3" /> },
          { label: 'Total ARR',     value: fmtARR(totalARR),    color: 'text-green-600', border: 'border-t-green-400', icon: <TrendingUp  className="w-3 h-3" /> },
          { label: 'At-risk clients',value: totalRed,           color: 'text-red-600',   border: 'border-t-red-400',   icon: <AlertTriangle className="w-3 h-3" /> },
          { label: 'Open signals',  value: totalSignals,        color: 'text-amber-600', border: 'border-t-amber-400', icon: <Zap         className="w-3 h-3" /> },
        ].map(({ label, value, color, border, icon }) => (
          <div key={label} className={`card text-center py-4 border-t-4 ${border}`}>
            <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium flex items-center justify-center gap-1">
              {icon} {label}
            </div>
          </div>
        ))}
      </div>

      {/* ── Pod cards ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {sortedPods.map((pod, i) => (
          <PodCard
            key={pod.id}
            pod={pod}
            podStats={podStats}
            canEdit={canManage}
            onEdit={p => setModal({ pod: p })}
            defaultOpen={i === 0}
          />
        ))}
      </div>

      {/* ── Unassigned clients ─────────────────────────────────────────────── */}
      {unassignedClients.length > 0 && (
        <div className="mt-3 card overflow-hidden p-0 border-dashed">
          <div className="px-5 py-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-gray-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-500">Unassigned</h2>
              <p className="text-xs text-gray-400">{unassignedClients.length} client{unassignedClients.length !== 1 ? 's' : ''} not in any pod</p>
            </div>
          </div>
          <div className="border-t border-border-subtle divide-y divide-border-subtle">
            {unassignedClients.map(c => <ClientRow key={c.id} client={c} />)}
          </div>
        </div>
      )}

      {/* ── Pod modal ──────────────────────────────────────────────────────── */}
      {modal && (
        <PodModal
          pod={modal.pod}
          zampians={zampians}
          onClose={() => setModal(null)}
          onSave={handleSave}
          isSaving={createPod.isPending || updatePod.isPending}
        />
      )}
    </div>
  )
}
