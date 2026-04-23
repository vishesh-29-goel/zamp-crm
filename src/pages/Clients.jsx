import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, X, ArrowRightLeft } from 'lucide-react'
import { useClients, usePods, useCreatePodTransfer } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import HealthBadge from '../components/HealthBadge'
import StageBadge from '../components/StageBadge'
import Spinner from '../components/Spinner'

const C2C_POD_ID = 4

// ─── Transfer Modal ────────────────────────────────────────────────────────────
function TransferModal({ client, pods, onClose }) {
  const [toPodId, setToPodId] = useState('')
  const [note, setNote]       = useState('')
  const createTransfer        = useCreatePodTransfer()

  const targetPods = pods.filter(p => p.id !== C2C_POD_ID)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!toPodId) return
    await createTransfer.mutateAsync({ client_id: client.id, to_pod_id: Number(toPodId), note })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <ArrowRightLeft className="w-4 h-4 text-zamp-600" />
            <h2 className="text-base font-semibold text-gray-900">Transfer to Revenue Pod</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-page text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Client chip */}
        <div className="px-6 pt-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zamp-50 border border-zamp-100 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zamp-200 to-zamp-100 flex items-center justify-center text-xs font-bold text-zamp-700 flex-shrink-0">
              {client.name[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{client.name}</p>
              <p className="text-xs text-gray-500">Currently in C2C Pod</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Target pod select */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Transfer to</label>
            <select
              value={toPodId}
              onChange={e => setToPodId(e.target.value)}
              required
              className="w-full px-3 py-2.5 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-zamp-500/30 focus:border-zamp-500 bg-white"
            >
              <option value="">Select a revenue pod…</option>
              {targetPods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Note <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Reason for transfer, context for the receiving GM…"
              className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-zamp-500/30 focus:border-zamp-500 resize-none placeholder:text-gray-300"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-border text-gray-600 hover:bg-surface-page transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!toPodId || createTransfer.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-zamp-600 text-white hover:bg-zamp-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {createTransfer.isPending
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <ArrowRightLeft className="w-3.5 h-3.5" />}
              Send Request
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function fmt(n) {
  if (!n) return '—'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n}`
}

const STAGE_OPTS  = ['live', 'poc', 'pilot', 'prospect', 'churned']
const HEALTH_OPTS = ['green', 'yellow', 'red']

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-zamp-50 text-zamp-700 text-xs font-medium rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-zamp-900"><X className="w-3 h-3" /></button>
    </span>
  )
}

const POD_SCOPED_ROLES = ['ASA', 'ASM', 'GM']

export default function Clients() {
  const { data: clients = [], isLoading } = useClients()
  const { data: pods = [] } = usePods()
  const { role, user } = useAuth()
  const [transferClient, setTransferClient] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // Who can initiate a transfer:
  //   - GM whose pod_id === C2C_POD_ID
  //   - SUPERADMIN regardless of pod (full access)
  const isC2cGm = role === 'SUPERADMIN' || (role === 'GM' && Number(user?.zampian?.pod_id) === C2C_POD_ID)

  // If Dashboard linked here with ?pod=<id>, resolve that to a pod name for the filter
  const podIdFromQuery = searchParams.get('pod')
  const podNameFromQuery = useMemo(() => {
    if (!podIdFromQuery) return null
    return pods.find(p => String(p.id) === String(podIdFromQuery))?.name || null
  }, [podIdFromQuery, pods])

  const [search,      setSearch]      = useState('')
  const [stages,      setStages]      = useState([])
  const [healths,     setHealths]     = useState([])
  // Start with the raw pod id from the URL so we can resolve it once pods load.
  // Falls back to an empty array; the useEffect below will set the real name.
  const [podFilter,   setPodFilter]   = useState([])
  const [sortKey,     setSortKey]     = useState('health')
  const [showFilters, setShowFilters] = useState(false)

  // Once pods have loaded, resolve the filter in priority order:
  //   1. ?pod=<id> in the URL  → filter to that pod, then clear the param
  //   2. No URL param          → default to the user's own pod if they have one
  //      (applies to ALL roles that have a pod_id, including SUPERADMIN)
  useEffect(() => {
    if (!pods.length) return // wait until pods are fetched

    if (podNameFromQuery) {
      // Dashboard linked us here with a specific pod — apply it and drop the param
      setPodFilter([podNameFromQuery])
      const next = new URLSearchParams(searchParams)
      next.delete('pod')
      setSearchParams(next, { replace: true })
    } else {
      // No URL param: seed from user's pod_id if they have one (first load only)
      const userPodId = user?.zampian?.pod_id
      if (userPodId) {
        const userPodName = pods.find(p => String(p.id) === String(userPodId))?.name
        if (userPodName) setPodFilter(prev => prev.length === 0 ? [userPodName] : prev)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pods])

  const podNames = useMemo(() => pods.map(p => p.name).sort(), [pods])

  const toggle = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val])

  const filtered = useMemo(() => {
    let list = clients
    if (search)          list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.industry||'').toLowerCase().includes(search.toLowerCase()))
    if (stages.length)   list = list.filter(c => stages.includes(c.stage))
    if (healths.length)  list = list.filter(c => healths.includes(c.health))
    if (podFilter.length) list = list.filter(c => podFilter.includes(c.pod_name))

    const hOrd = { red: 0, yellow: 1, green: 2 }
    const sOrd = { live: 0, poc: 1, pilot: 2, prospect: 3, churned: 4 }
    if (sortKey === 'health') list = [...list].sort((a,b) => (hOrd[a.health]??9) - (hOrd[b.health]??9))
    if (sortKey === 'stage')  list = [...list].sort((a,b) => (sOrd[a.stage]??9)  - (sOrd[b.stage]??9))
    if (sortKey === 'arr')    list = [...list].sort((a,b) => (Number(b.arr)||0) - (Number(a.arr)||0))
    if (sortKey === 'name')   list = [...list].sort((a,b) => a.name.localeCompare(b.name))
    return list
  }, [clients, search, stages, healths, podFilter, sortKey])

  const activeFilters = [
    ...stages.map(s   => ({ label: s, onRemove: () => toggle(stages, setStages, s) })),
    ...healths.map(h  => ({ label: h, onRemove: () => toggle(healths, setHealths, h) })),
    ...podFilter.map(p => ({ label: p, onRemove: () => toggle(podFilter, setPodFilter, p) })),
  ]

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>

  const isPodScoped = POD_SCOPED_ROLES.includes(role)

  // Column headers — add Transfer column for C2C GM
  const tableHeaders = ['Client', 'Stage', 'Health', 'ARR', 'Pod', 'Team', 'Open Tasks', ...(isC2cGm ? [''] : [])]
  const userPodName = isPodScoped
    ? pods.find(p => String(p.id) === String(user?.zampian?.pod_id))?.name
    : null
  const isMyPodActive = userPodName && podFilter.length === 1 && podFilter[0] === userPodName

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {transferClient && (
        <TransferModal
          client={transferClient}
          pods={pods}
          onClose={() => setTransferClient(null)}
        />
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {clients.length} shown</p>
        </div>

        {/* My Pod / All Clients quick toggle — only for ASA/ASM */}
        {isPodScoped && userPodName && (
          <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setPodFilter([userPodName])}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isMyPodActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Pod
            </button>
            <button
              onClick={() => setPodFilter([])}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                !isMyPodActive
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              All Clients
            </button>
          </div>
        )}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients or industry…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-500 bg-white placeholder:text-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`btn-ghost border ${showFilters ? 'border-zamp-300 text-zamp-600 bg-zamp-50' : 'border-border'}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilters.length > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-zamp-500 text-white text-xs flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </button>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value)}
          className="btn-ghost border border-border pr-8 cursor-pointer text-sm"
        >
          <option value="health">Sort: Health</option>
          <option value="stage">Sort: Stage</option>
          <option value="arr">Sort: ARR</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      {showFilters && (
        <div className="bg-white border border-border rounded-xl p-4 mb-4 grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Stage</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGE_OPTS.map(s => (
                <button key={s} onClick={() => toggle(stages, setStages, s)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                    ${stages.includes(s) ? 'bg-zamp-500 text-white border-zamp-500' : 'bg-white text-gray-600 border-gray-200 hover:border-zamp-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Health</p>
            <div className="flex flex-wrap gap-1.5">
              {HEALTH_OPTS.map(h => (
                <button key={h} onClick={() => toggle(healths, setHealths, h)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                    ${healths.includes(h) ? 'bg-zamp-500 text-white border-zamp-500' : 'bg-white text-gray-600 border-gray-200 hover:border-zamp-300'}`}>
                  {h}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pod</p>
            <div className="flex flex-col gap-1">
              {podNames.map(p => (
                <button key={p} onClick={() => toggle(podFilter, setPodFilter, p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border text-left transition-colors
                    ${podFilter.includes(p) ? 'bg-zamp-500 text-white border-zamp-500' : 'bg-white text-gray-600 border-gray-200 hover:border-zamp-300'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map((f, i) => <Chip key={i} label={f.label} onRemove={f.onRemove} />)}
          <button onClick={() => { setStages([]); setHealths([]); setPodFilter([]) }}
            className="text-xs text-gray-400 hover:text-gray-600 underline">Clear all</button>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-page">
              {tableHeaders.map((h, i) => (
                <th key={i} className="text-left table-header px-5 py-3.5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-surface-page transition-colors group">
                <td className="px-5 py-3.5">
                  <Link to={`/clients/${c.id}`} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zamp-100 to-zamp-50 flex items-center justify-center text-xs font-bold text-zamp-600 flex-shrink-0">
                      {c.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-zamp-600 transition-colors">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.industry}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-3.5"><StageBadge stage={c.stage} /></td>
                <td className="px-5 py-3.5"><HealthBadge health={c.health} /></td>
                <td className="px-5 py-3.5 text-sm font-medium text-gray-700">{fmt(Number(c.arr))}</td>
                <td className="px-5 py-3.5 text-sm text-gray-600">{c.pod_name || '—'}</td>
                <td className="px-5 py-3.5 text-xs text-gray-500">
                  {[c.csm_name, c.ae_name].filter(Boolean).join(', ') || '—'}
                </td>
                <td className="px-5 py-3.5">
                  {c.open_tasks_count > 0
                    ? <span className="badge-yellow">{c.open_tasks_count} open</span>
                    : <span className="text-sm text-gray-400">—</span>
                  }
                </td>
                {isC2cGm && (
                  <td className="px-5 py-3.5">
                    {c.pod_id === C2C_POD_ID && (
                      <button
                        onClick={(e) => { e.preventDefault(); setTransferClient(c) }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zamp-600 hover:bg-zamp-50 border border-zamp-200 hover:border-zamp-300 transition-colors"
                        title="Transfer to revenue pod"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        Transfer
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">No clients match your filters.</div>
        )}
      </div>
    </div>
  )
}
