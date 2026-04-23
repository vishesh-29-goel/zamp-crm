import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  MessageSquare, Mic, PenLine, CheckCircle2, CheckCheck,
  ArrowRight, Inbox, Slack,
  User, AlertTriangle, CalendarClock, Clock, Circle,
} from 'lucide-react'
import { useAsks, useUpdateAsk } from '../lib/useApi'
import AskDetailDrawer from './AskDetailDrawer'

// ── helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  const d = Math.floor(s / 86400)
  if (d === 1)  return 'yesterday'
  if (d < 30)   return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

function formatEta(etaStr) {
  if (!etaStr) return null
  const [y, m, d] = etaStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function etaState(etaStr, status) {
  if (!etaStr) return null
  if (status === 'resolved' || status === 'wont_fix') return null
  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const [y, m, d] = etaStr.split('T')[0].split('-').map(Number)
  const eta = new Date(y, m - 1, d)
  if (eta < today) return 'overdue'
  if (eta.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}

// ── config ────────────────────────────────────────────────────────────────────

const SOURCE_CFG = {
  slack:  { label: 'Slack',  Icon: Slack,         cls: 'bg-purple-50 text-purple-600 border-purple-100' },
  avoma:  { label: 'Avoma',  Icon: Mic,           cls: 'bg-blue-50   text-blue-600   border-blue-100'   },
  email:  { label: 'Email',  Icon: MessageSquare, cls: 'bg-green-50  text-green-600  border-green-100'  },
  manual: { label: 'Manual', Icon: PenLine,        cls: 'bg-gray-100  text-gray-500   border-gray-200'   },
}

const STATUS_CFG = {
  open:        { label: 'Open',        Icon: Circle,       cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Progress', Icon: Clock,        cls: 'bg-blue-100  text-blue-700  border-blue-200'  },
  resolved:    { label: 'Resolved',    Icon: CheckCircle2, cls: 'bg-green-100 text-green-700 border-green-200' },
}

// ── EtaChip ───────────────────────────────────────────────────────────────────

function EtaChip({ eta, status }) {
  const state = etaState(eta, status)
  if (!state) return null
  const label = `Due ${formatEta(eta)}`
  if (state === 'overdue') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
      <AlertTriangle className="w-3 h-3" />{label}
    </span>
  )
  if (state === 'today') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
      <CalendarClock className="w-3 h-3" />{label}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <CalendarClock className="w-3 h-3" />{label}
    </span>
  )
}

// ── AskCard (elevated card, not a flat row) ───────────────────────────────────

// Strip inline metadata baked into ask_text by the AI engine
function cleanAskText(text) {
  if (!text) return text
  return text
    .replace(/\s*\(Owner:[^)]*\)\s*$/i, '')
    .replace(/\s*\(Owner:[\s\S]*$/i, '')
    .replace(/\s+Owner:\s+[\s\S]*$/i, '')
    .trim()
}

function AskCard({ ask, onResolve, resolving, onClick }) {
  const src       = SOURCE_CFG[ask.source?.toLowerCase()] || SOURCE_CFG.manual
  const SrcIcon   = src.Icon
  const statusCfg = STATUS_CFG[ask.status] || STATUS_CFG.open
  const StatusIcon = statusCfg.Icon
  const isDone    = ask.status === 'resolved' || ask.status === 'wont_fix'
  const displayText = cleanAskText(ask.ask_text)
  const state     = etaState(ask.eta, ask.status)

  // Card border emphasis: overdue → amber, in_progress → blue, default → gray
  const borderCls = state === 'overdue'
    ? 'border-amber-200 bg-amber-50/30'
    : ask.status === 'in_progress'
      ? 'border-blue-100 bg-blue-50/20'
      : 'border-gray-100 bg-white'

  return (
    <div onClick={onClick} className={`group rounded-xl border transition-all duration-150 hover:shadow-[0_2px_10px_rgba(0,0,0,0.07)] hover:border-gray-200 min-h-[140px] flex flex-col cursor-pointer ${borderCls}`}>
      <div className="p-3 space-y-2 flex flex-col flex-1">

        {/* Top row: status pill + source tag + age */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.cls}`}>
            <StatusIcon className="w-3 h-3" />
            {statusCfg.label}
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${src.cls}`}>
            <SrcIcon className="w-3 h-3" />
            {src.label}
            {ask.source_channel && (
              <span className="opacity-70">
                · #{ask.source_channel.replace(/^#/, '').replace(/^.*\//, '')}
              </span>
            )}
          </span>
          <span className="ml-auto text-xs text-gray-400">{timeAgo(ask.raised_at)}</span>
        </div>

        {/* Ask text — 2 lines max on dashboard */}
        <p className={`text-sm leading-snug font-medium line-clamp-3 ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {displayText}
        </p>

        {/* Footer: client · owner · resolve */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-gray-50">
          <div className="flex flex-col gap-0.5 min-w-0">
            {ask.client_name && (
              <span className="text-xs font-semibold text-gray-700 truncate">{ask.client_name}</span>
            )}
            <span className="text-xs text-gray-400 truncate">
              {ask.owner_name ? `by ${ask.owner_name}` : 'No owner'}
            </span>
          </div>

          {ask.status === 'open' && (
            <button
              onClick={e => { e.stopPropagation(); onResolve(ask.id) }}
              disabled={resolving}
              title="Mark resolved"
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium px-2 py-0.5 rounded-lg hover:bg-green-50 disabled:opacity-30"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

// ── OpenAsksPanel ─────────────────────────────────────────────────────────────

export default function OpenAsksPanel({ podId = null }) {
  const { data: allAsks = [], isLoading } = useAsks()
  const updateAsk = useUpdateAsk()
  const [activeTab, setActiveTab] = useState('__all')
  const [selectedAsk, setSelectedAsk] = useState(null)

  function handleResolve(id) {
    updateAsk.mutate({ id, status: 'resolved' })
  }

  const openAsks = allAsks
    .filter(a => a.status === 'open' || a.status === 'in_progress')
    .filter(a => !podId || String(a.pod_id) === String(podId))

  // Groups sorted by overdue count desc, then name — so most urgent tab is first
  const groups = useMemo(() => {
    const map = {}
    for (const ask of openAsks) {
      const key = String(ask.client_id || '__unknown')
      if (!map[key]) map[key] = { clientId: ask.client_id, clientName: ask.client_name || 'Unknown', asks: [] }
      map[key].asks.push(ask)
    }
    return Object.values(map).sort((a, b) => {
      const aOverdue = a.asks.filter(x => etaState(x.eta, x.status) === 'overdue').length
      const bOverdue = b.asks.filter(x => etaState(x.eta, x.status) === 'overdue').length
      if (bOverdue !== aOverdue) return bOverdue - aOverdue
      return a.clientName.localeCompare(b.clientName)
    })
  }, [openAsks])

  // If the active tab's client had all asks resolved, fall back to All
  const safeTab = activeTab === '__all' || groups.some(g => String(g.clientId) === activeTab)
    ? activeTab : '__all'

  const visibleAsks = safeTab === '__all'
    ? openAsks
    : (groups.find(g => String(g.clientId) === safeTab)?.asks ?? [])

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Inbox className="w-4 h-4 text-gray-400" />
          Open Asks
          {!isLoading && openAsks.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
              {openAsks.length}
            </span>
          )}
        </h2>
        <Link to="/clients" className="text-xs text-zamp-600 hover:underline flex items-center gap-1">
          All clients <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && openAsks.length === 0 && (
        <div className="py-10 flex flex-col items-center justify-center text-center gap-2">
          <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-sm font-medium text-gray-700">All caught up!</p>
          <p className="text-xs text-gray-400">No open asks across any clients right now.</p>
        </div>
      )}

      {!isLoading && groups.length > 0 && (
        <>
          {/* Client tabs */}
          <div className="flex items-center gap-0 border-b border-gray-100 -mx-5 px-5 mb-5 overflow-x-auto">
            {/* All tab */}
            <button
              onClick={() => setActiveTab('__all')}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                safeTab === '__all'
                  ? 'border-zamp-500 text-zamp-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
              }`}
            >
              All
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                safeTab === '__all' ? 'bg-zamp-50 text-zamp-600' : 'bg-gray-100 text-gray-500'
              }`}>
                {openAsks.length}
              </span>
            </button>

            {/* Per-client tabs */}
            {groups.map(g => {
              const overdueCount = g.asks.filter(a => etaState(a.eta, a.status) === 'overdue').length
              const isActive = safeTab === String(g.clientId)
              return (
                <button
                  key={g.clientId}
                  onClick={() => setActiveTab(String(g.clientId))}
                  className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                    isActive
                      ? 'border-zamp-500 text-zamp-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                  }`}
                >
                  {overdueCount > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                  )}
                  {g.clientName}
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                    isActive ? 'bg-zamp-50 text-zamp-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {g.asks.length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Ask cards for active tab — grid layout */}
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {visibleAsks.map(a => (
              <AskCard
                key={a.id}
                ask={a}
                onResolve={handleResolve}
                resolving={updateAsk.isPending}
                onClick={() => setSelectedAsk(a)}
              />
            ))}
          </div>
        </>
      )}

      <AskDetailDrawer ask={selectedAsk} onClose={() => setSelectedAsk(null)} />
    </div>
  )
}
