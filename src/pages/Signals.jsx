import { useState } from 'react'
import { useAsks, useSignals, useUpdateSignal, useUpdateAsk, useClients } from '../lib/useApi'
import Spinner from '../components/Spinner'
import { Zap, Bell, CheckCircle2, X, ChevronDown, MessageSquare, Mail, Video, Pencil } from 'lucide-react'

const ASK_SOURCE_COLOR = {
  email:  { bg: 'bg-blue-50',   border: 'border-blue-200',   color: 'text-blue-700',   dot: 'bg-blue-400' },
  slack:  { bg: 'bg-purple-50', border: 'border-purple-200', color: 'text-purple-700', dot: 'bg-purple-400' },
  avoma:  { bg: 'bg-green-50',  border: 'border-green-200',  color: 'text-green-700',  dot: 'bg-green-400' },
  manual: { bg: 'bg-gray-50',   border: 'border-border',   color: 'text-gray-700',   dot: 'bg-gray-400' },
}
const ASK_STATUS_COLOR = {
  open:        'bg-amber-100  text-amber-700',
  in_progress: 'bg-blue-100   text-blue-700',
  resolved:    'bg-green-100  text-green-700',
  wont_fix:    'bg-gray-100   text-gray-500',
}
const SIGNAL_TYPE_COLOR = {
  follow_up_pending:    'bg-amber-100  text-amber-700',
  commitment_at_risk:   'bg-red-100    text-red-700',
  no_recent_contact:    'bg-orange-100 text-orange-700',
  blocker:              'bg-red-100    text-red-700',
  health_degraded:      'bg-red-100    text-red-700',
  positive:             'bg-green-100  text-green-700',
}

// ─── Source icon + label ─────────────────────────────────────────────────────

const SOURCE_ICON = {
  slack:  { Icon: MessageSquare, label: 'Slack',  bg: 'bg-purple-50',  color: 'text-purple-600', border: 'border-purple-200' },
  email:  { Icon: Mail,          label: 'Email',  bg: 'bg-blue-50',    color: 'text-blue-600',   border: 'border-blue-200'   },
  avoma:  { Icon: Video,         label: 'Avoma',  bg: 'bg-green-50',   color: 'text-green-600',  border: 'border-green-200'  },
  manual: { Icon: Pencil,        label: 'Manual', bg: 'bg-gray-50',    color: 'text-gray-500',   border: 'border-gray-200'   },
}

function EvidenceRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-400 font-medium w-24 flex-shrink-0">{label}</span>
      <span className="text-gray-700 break-all">{value}</span>
    </div>
  )
}

function SignalEvidence({ signal }) {
  const [open, setOpen] = useState(false)
  const meta = signal.metadata
  const src  = SOURCE_ICON[signal.source_type] || SOURCE_ICON.manual
  const Icon = src.Icon

  // Determine if there's anything worth showing
  const hasEvidence = meta && Object.keys(meta).some(k => meta[k] != null && meta[k] !== '')

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border transition-colors
          ${src.bg} ${src.color} ${src.border} hover:opacity-80`}
      >
        <Icon className="w-3 h-3" />
        {src.label}
        {hasEvidence && (
          <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && hasEvidence && (
        <div className={`mt-2 rounded-lg border ${src.border} ${src.bg} px-3 py-2.5 space-y-1.5`}>
          {/* Slack-specific */}
          <EvidenceRow label="Channel"    value={meta.channel_name} />
          <EvidenceRow label="Sender"     value={meta.sender_name || meta.sender} />
          <EvidenceRow label="Thread"     value={meta.thread_ts ? `ts:${meta.thread_ts}` : null} />
          {/* Email-specific */}
          <EvidenceRow label="From"       value={meta.from} />
          <EvidenceRow label="Subject"    value={meta.subject} />
          {/* Avoma-specific */}
          <EvidenceRow label="Meeting"    value={meta.meeting_title} />
          <EvidenceRow label="Speaker"    value={meta.speaker} />
          <EvidenceRow label="Timestamp"  value={meta.timestamp} />
          {/* Generic excerpt — shown for any source */}
          {meta.excerpt && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <p className={`text-xs italic leading-relaxed ${src.color} opacity-90`}>
                &ldquo;{meta.excerpt}&rdquo;
              </p>
            </div>
          )}
          {/* Fallback: if no recognised fields but metadata exists, dump as JSON */}
          {!meta.channel_name && !meta.from && !meta.meeting_title && !meta.excerpt && (
            <pre className="text-xs text-gray-500 whitespace-pre-wrap break-all">
              {JSON.stringify(meta, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Signals() {
  const [showAllSignals, setShowAllSignals] = useState(false)

  const { data: asks = [],    isLoading: asksLoading }    = useAsks()
  const { data: allSignals = [], isLoading: signalsLoading } = useSignals()
  const { data: clients = [] } = useClients()
  const updateSignal = useUpdateSignal()
  const updateAsk    = useUpdateAsk()

  const isLoading = asksLoading || signalsLoading

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>

  const openSignals = allSignals.filter(s => s.status === 'open')
  const visibleSignals = showAllSignals ? allSignals : openSignals

  const openAsks   = asks.filter(a => a.status === 'open')
  const inProgAsks = asks.filter(a => a.status === 'in_progress')
  const resolvedAsks = asks.filter(a => a.status === 'resolved')

  function clientName(clientId) {
    const c = clients.find(c => c.id === clientId)
    return c?.name || null
  }

  function handleSignalAction(id, status) {
    updateSignal.mutate({ id, status })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Signals & Open Asks</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {openSignals.length} AI signals · {openAsks.length} open asks · {inProgAsks.length} in progress
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="card text-center py-4 border-t-4 border-t-purple-400">
          <div className="text-2xl font-bold text-purple-600">{openSignals.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">AI Signals</div>
        </div>
        <div className="card text-center py-4 border-t-4 border-t-amber-400">
          <div className="text-2xl font-bold text-amber-600">{openAsks.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Open Asks</div>
        </div>
        <div className="card text-center py-4 border-t-4 border-t-blue-400">
          <div className="text-2xl font-bold text-blue-600">{inProgAsks.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">In Progress</div>
        </div>
        <div className="card text-center py-4 border-t-4 border-t-green-400">
          <div className="text-2xl font-bold text-green-600">{resolvedAsks.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Resolved</div>
        </div>
      </div>

      {/* ── AI Signals section ── */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-purple-500" />
            AI Signals
            {openSignals.length > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{openSignals.length} open</span>
            )}
          </h2>
          {allSignals.length > 0 && (
            <button
              onClick={() => setShowAllSignals(v => !v)}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              {showAllSignals ? 'Show open only' : `Show all (${allSignals.length})`}
            </button>
          )}
        </div>

        {visibleSignals.length === 0 ? (
          <div className="card py-10 text-center">
            <Bell className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No AI signals yet. Run crm-ai-engine to detect signals.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...visibleSignals]
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
              .map(s => {
                const name = s.client_name || clientName(s.client_id)
                const typeCls = SIGNAL_TYPE_COLOR[s.signal_type] || 'bg-gray-100 text-gray-600'
                const isDismissed = s.status === 'dismissed'
                const isResolved  = s.status === 'resolved'
                return (
                  <div key={s.id} className={`card border transition-opacity ${isDismissed || isResolved ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Zap className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${typeCls}`}>
                              {s.signal_type?.replace(/_/g, ' ')}
                            </span>
                            {name && <span className="text-xs font-medium text-gray-600">{name}</span>}
                            {(isDismissed || isResolved) && (
                              <span className="text-xs text-gray-400 italic capitalize">{s.status}</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed">{s.signal_text}</p>
                          <SignalEvidence signal={s} />
                          {s.created_at && (
                            <p className="text-xs text-gray-400 mt-1.5">{new Date(s.created_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      {s.status === 'open' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleSignalAction(s.id, 'resolved')}
                            disabled={updateSignal.isPending}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors font-medium disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Resolve
                          </button>
                          <button
                            onClick={() => handleSignalAction(s.id, 'dismissed')}
                            disabled={updateSignal.isPending}
                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600 hover:bg-surface-page border border-border transition-colors font-medium disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* ── Open Asks section ── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-amber-500" />
          Open Asks
        </h2>

        {asks.length === 0 ? (
          <div className="card py-10 text-center">
            <Bell className="w-7 h-7 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No open asks yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...asks]
              .sort((a, b) => new Date(b.raised_at) - new Date(a.raised_at))
              .map(a => {
                const meta = ASK_SOURCE_COLOR[a.source] || ASK_SOURCE_COLOR.manual
                return (
                  <div key={a.id} className={`card border ${meta.bg} ${meta.border}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${meta.dot}`} />
                        <div className="flex-1">
                          <p className="text-sm text-gray-800 leading-relaxed">{a.ask_text}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className={`text-xs font-medium ${meta.color} capitalize`}>{a.source}</span>
                            {a.client_name && <span className="text-xs text-gray-500 font-medium">{a.client_name}</span>}
                            {a.owner_name  && <span className="text-xs text-gray-400">→ {a.owner_name}</span>}
                            <span className="text-xs text-gray-400">{new Date(a.raised_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ASK_STATUS_COLOR[a.status] || 'bg-gray-100 text-gray-600'}`}>
                          {a.status?.replace('_', ' ')}
                        </span>
                        {a.status !== 'resolved' && a.status !== 'wont_fix' && (
                          <button
                            onClick={() => updateAsk.mutate({ id: a.id, status: 'resolved' })}
                            disabled={updateAsk.isPending}
                            className="text-xs text-green-600 hover:text-green-800 font-medium flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 transition-colors disabled:opacity-50"
                            title="Mark resolved"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}
