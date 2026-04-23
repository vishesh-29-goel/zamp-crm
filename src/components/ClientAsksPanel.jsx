import { useState } from 'react'
import {
  CheckCircle2, Clock, Circle, MessageSquare,
  Slack, Mic, PenLine, ExternalLink, Plus, X,
  CheckCheck, User, AlertTriangle, CalendarClock,
} from 'lucide-react'
import { useAsks, useCreateAsk, useUpdateAsk, useZampians } from '../lib/useApi'
import Spinner from './Spinner'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return null
  const diff  = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 30)  return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

function formatEta(etaStr) {
  if (!etaStr) return null
  // etaStr is YYYY-MM-DD from DB
  const [year, month, day] = etaStr.split('T')[0].split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function etaState(etaStr, status) {
  if (!etaStr) return null
  if (status === 'resolved' || status === 'wont_fix') return 'resolved'
  const today   = new Date(); today.setHours(0,0,0,0)
  const [year, month, day] = etaStr.split('T')[0].split('-').map(Number)
  const etaDate = new Date(year, month - 1, day)
  if (etaDate < today)  return 'overdue'
  if (etaDate.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG = {
  open: {
    label: 'Open',
    cls:   'bg-amber-100 text-amber-700 border border-amber-200',
    icon:  <Circle className="w-3 h-3" />,
  },
  in_progress: {
    label: 'In Progress',
    cls:   'bg-blue-100 text-blue-700 border border-blue-200',
    icon:  <Clock className="w-3 h-3" />,
  },
  resolved: {
    label: 'Resolved',
    cls:   'bg-green-100 text-green-700 border border-green-200',
    icon:  <CheckCircle2 className="w-3 h-3" />,
  },
  wont_fix: {
    label: "Won't Fix",
    cls:   'bg-gray-100 text-gray-500 border border-gray-200',
    icon:  <X className="w-3 h-3" />,
  },
}

// ─── Source tag ────────────────────────────────────────────────────────────────

function SourceTag({ source, sourceChannel }) {
  if (!source) return null
  const cfg = {
    slack:  { label: 'Slack',  icon: <Slack   className="w-3 h-3" />, cls: 'bg-purple-50 text-purple-600 border-purple-100' },
    avoma:  { label: 'Avoma',  icon: <Mic     className="w-3 h-3" />, cls: 'bg-blue-50   text-blue-600   border-blue-100'   },
    email:  { label: 'Email',  icon: <MessageSquare className="w-3 h-3" />, cls: 'bg-green-50 text-green-600 border-green-100' },
    manual: { label: 'Manual', icon: <PenLine className="w-3 h-3" />, cls: 'bg-gray-50   text-gray-500   border-gray-200'   },
  }[source.toLowerCase()] || { label: source, icon: null, cls: 'bg-gray-50 text-gray-500 border-gray-200' }

  // Normalise channel: strip leading # and any "zamp-internal/" prefix
  const channel = sourceChannel
    ? sourceChannel.replace(/^#/, '').replace(/^.*\//, '')
    : null

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.cls}`}>
      {cfg.icon}
      {cfg.label}
      {channel && (
        <span className="opacity-70">· #{channel}</span>
      )}
    </span>
  )
}

// ─── ETA chip ──────────────────────────────────────────────────────────────────

function EtaChip({ eta, status }) {
  const state = etaState(eta, status)
  if (!state || state === 'resolved') return null

  const label = `Due ${formatEta(eta)}`

  if (state === 'overdue') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
      <AlertTriangle className="w-3 h-3" />
      {label}
    </span>
  )
  if (state === 'today') return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500">
      <CalendarClock className="w-3 h-3" />
      {label}
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-400">
      <CalendarClock className="w-3 h-3" />
      {label}
    </span>
  )
}

// ─── Single Ask Card ──────────────────────────────────────────────────────────

// Strip inline metadata baked into ask_text by the AI engine
// e.g. "(Owner: Sparsh; ETA: TBD; Source: squad-gtm)" or " Owner: Prabhu | Due: ASAP"
function cleanAskText(text) {
  if (!text) return text
  return text
    .replace(/\s*\(Owner:[^)]*\)\s*$/i, '')
    .replace(/\s*\(Owner:[\s\S]*$/i, '')
    .replace(/\s+Owner:\s+[\s\S]*$/i, '')
    .trim()
}

function AskCard({ ask, onResolve, onMarkInProgress, resolving }) {
  const cfg      = STATUS_CFG[ask.status] || STATUS_CFG.open
  const age      = timeAgo(ask.raised_at)
  const isOpen   = ask.status === 'open'
  const isDone   = ask.status === 'resolved' || ask.status === 'wont_fix'
  const state    = etaState(ask.eta, ask.status)
  const displayText = cleanAskText(ask.ask_text)

  const slackUrl = ask.slack_thread_ts
    ? `https://slack.com/app_redirect?channel=${ask.slack_channel || ''}&message_ts=${ask.slack_thread_ts}`
    : null

  // Card border: overdue → amber, in_progress → blue-100, default → gray-100
  const borderCls = isDone
    ? 'border-gray-100'
    : state === 'overdue'
      ? 'border-amber-200'
      : ask.status === 'in_progress'
        ? 'border-blue-100'
        : 'border-gray-100'

  return (
    <div className={`
      group relative bg-white rounded-xl border transition-all duration-150
      ${isDone
        ? `${borderCls} opacity-60`
        : `${borderCls} hover:border-gray-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)]`}
    `}>
      <div className="p-4 space-y-2.5">

        {/* Top row: source tag · status pill · age */}
        <div className="flex items-center gap-2 flex-wrap">
          <SourceTag source={ask.source} sourceChannel={ask.source_channel} />
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.cls}`}>
            {cfg.icon}
            {cfg.label}
          </span>
          {age && (
            <span className="ml-auto text-xs text-gray-400">{age}</span>
          )}
        </div>

        {/* Ask text */}
        <p className={`text-sm leading-relaxed font-medium ${isDone ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {displayText}
        </p>

        {/* Footer strip: owner · ETA · Slack link + action buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50 gap-2 flex-wrap">

          {/* Left side: flagged-by · assignee · ETA · Slack */}
          <div className="flex items-center gap-2 flex-wrap min-w-0">

            {/* Flagged by (owner) */}
            {ask.owner_name && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
                <span className="text-gray-400">by</span>
                <span className="font-medium text-gray-600">{ask.owner_name}</span>
              </span>
            )}

            {/* Assignee — who will close it */}
            {ask.assignee_name && (
              <>
                {ask.owner_name && <span className="text-gray-300 text-xs">·</span>}
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <CheckCheck className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-400">closes</span>
                  <span className="font-medium text-gray-700">{ask.assignee_name}</span>
                </span>
              </>
            )}

            {/* Fallback: neither set */}
            {!ask.owner_name && !ask.assignee_name && (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400 italic">
                <User className="w-3 h-3 flex-shrink-0" />
                Unassigned
              </span>
            )}

            {/* ETA — only if set and not resolved */}
            {ask.eta && (
              <>
                <span className="text-gray-300 text-xs">·</span>
                <EtaChip eta={ask.eta} status={ask.status} />
              </>
            )}

            {/* Slack deep-link — only if thread ref present */}
            {slackUrl && (
              <>
                <span className="text-gray-300 text-xs">·</span>
                <a
                  href={slackUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                  Thread
                </a>
              </>
            )}
          </div>

          {/* Right side: action buttons */}
          {!isDone && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isOpen && (
                <button
                  onClick={() => onMarkInProgress(ask.id)}
                  disabled={resolving}
                  className="text-xs px-2 py-1 rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-medium disabled:opacity-40"
                >
                  In Progress
                </button>
              )}
              <button
                onClick={() => onResolve(ask.id)}
                disabled={resolving}
                className="text-xs px-2 py-1 rounded-md border border-green-200 bg-green-50 text-green-700 hover:bg-green-100 transition-colors font-medium disabled:opacity-40 inline-flex items-center gap-1"
              >
                <CheckCheck className="w-3 h-3" />
                Resolve
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

// ─── Add Ask Form ─────────────────────────────────────────────────────────────

function AddAskForm({ clientId, onCancel, onCreate }) {
  const createAsk  = useCreateAsk()
  const { data: zampians = [] } = useZampians()
  const [text,    setText]    = useState('')
  const [eta,     setEta]     = useState('')
  const [ownerId, setOwnerId] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    const payload = { client_id: clientId, ask_text: text.trim(), source: 'manual', status: 'open' }
    if (eta)     payload.eta      = eta
    if (ownerId) payload.owner_id = Number(ownerId)
    createAsk.mutate(payload, {
      onSuccess: () => {
        setText('')
        setEta('')
        setOwnerId('')
        onCreate()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-zamp-100 p-4 space-y-3 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-800">New Open Ask</h3>
      <textarea
        required
        autoFocus
        placeholder="Describe the client's ask or request..."
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-500 resize-none placeholder-gray-300"
      />
      <div className="flex items-center gap-4 flex-wrap">
        {/* Flagged by */}
        <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <label className="flex-shrink-0">Flagged by</label>
          <select
            value={ownerId}
            onChange={e => setOwnerId(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-500 text-gray-700 bg-white"
          >
            <option value="">Unassigned</option>
            {zampians.map(z => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </div>
        {/* ETA */}
        <div className="flex items-center gap-2 text-sm text-gray-500 flex-shrink-0">
          <CalendarClock className="w-3.5 h-3.5 text-gray-400" />
          <label className="flex-shrink-0">ETA</label>
          <input
            type="date"
            value={eta}
            onChange={e => setEta(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-500 text-gray-700"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm px-4 py-1.5 text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createAsk.isPending || !text.trim()}
          className="text-sm px-4 py-1.5 rounded-lg bg-zamp-600 text-white hover:bg-zamp-700 disabled:opacity-50 font-medium transition-colors flex items-center gap-1.5"
        >
          {createAsk.isPending ? <><Spinner />&nbsp;Adding…</> : 'Add Ask'}
        </button>
      </div>
    </form>
  )
}

// ─── Filter Tab Button ────────────────────────────────────────────────────────

function FilterTab({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5
        ${active
          ? 'bg-gray-900 text-white'
          : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'}
      `}
    >
      {label}
      <span className={`
        inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
        ${active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}
      `}>
        {count}
      </span>
    </button>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ filter }) {
  if (filter === 'resolved') return (
    <div className="py-16 text-center">
      <CheckCircle2 className="w-8 h-8 text-gray-200 mx-auto mb-3" />
      <p className="text-sm text-gray-400 font-medium">No resolved asks yet.</p>
    </div>
  )
  return (
    <div className="py-16 text-center">
      <CheckCheck className="w-8 h-8 text-gray-200 mx-auto mb-3" />
      <p className="text-sm font-medium text-gray-400">No open asks — all clear!</p>
      <p className="text-xs text-gray-300 mt-1">Add one if the client raised something during a call or over Slack.</p>
    </div>
  )
}

// ─── Direction Section ────────────────────────────────────────────────────────

function DirectionSection({ title, colorScheme, asks, emptyText, onResolve, onMarkInProgress, resolving }) {
  const count = asks.length

  // colorScheme: 'zamp' (orange — we owe them) | 'client' (sky/blue — they owe us)
  const headerCls = colorScheme === 'zamp'
    ? 'bg-orange-50 border-orange-200 text-orange-800'
    : 'bg-sky-50 border-sky-200 text-sky-800'

  const countCls = colorScheme === 'zamp'
    ? 'bg-orange-100 text-orange-700 border-orange-200'
    : 'bg-sky-100 text-sky-700 border-sky-200'

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      {/* Section header bar */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${headerCls}`}>
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${countCls}`}>
          {count}
        </span>
      </div>

      {/* Cards or empty state */}
      <div className="bg-gray-50/50 p-3 space-y-2.5">
        {count === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400 italic">{emptyText}</p>
        ) : (
          asks.map(ask => (
            <AskCard
              key={ask.id}
              ask={ask}
              onResolve={onResolve}
              onMarkInProgress={onMarkInProgress}
              resolving={resolving}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─── Main Panel Export ────────────────────────────────────────────────────────

export default function ClientAsksPanel({ clientId }) {
  const { data: asks = [], isLoading } = useAsks({ client_id: clientId })
  const updateAsk = useUpdateAsk()
  const [filter, setFilter]     = useState('open')
  const [showForm, setShowForm] = useState(false)

  if (isLoading) return <div className="py-12 flex justify-center"><Spinner /></div>

  // Sort newest first
  const sorted = [...asks].sort((a, b) => new Date(b.raised_at) - new Date(a.raised_at))

  const activeAsks   = sorted.filter(a => a.status === 'open' || a.status === 'in_progress')
  const resolvedAsks = sorted.filter(a => a.status === 'resolved' || a.status === 'wont_fix')

  const counts = { all: sorted.length, open: activeAsks.length, resolved: resolvedAsks.length }
  const filtered = { all: sorted, open: activeAsks, resolved: resolvedAsks }[filter] || sorted

  // Direction split — only used in the 'open' filter view
  const zampOwes   = activeAsks.filter(a => a.direction === 'zamp_owes_client')
  const clientOwes = activeAsks.filter(a => a.direction === 'client_owes_zamp' || !a.direction)

  function handleResolve(id)        { updateAsk.mutate({ id, status: 'resolved'    }) }
  function handleMarkInProgress(id) { updateAsk.mutate({ id, status: 'in_progress' }) }

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">Open Asks</h2>
          {counts.open > 0 && (
            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
              {counts.open}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <FilterTab label="Open"     count={counts.open}     active={filter === 'open'}     onClick={() => setFilter('open')}     />
            <FilterTab label="Resolved" count={counts.resolved} active={filter === 'resolved'} onClick={() => setFilter('resolved')} />
            <FilterTab label="All"      count={counts.all}      active={filter === 'all'}      onClick={() => setFilter('all')}      />
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-zamp-600 text-white hover:bg-zamp-700 transition-colors"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? 'Cancel' : 'Add Ask'}
          </button>
        </div>
      </div>

      {/* Add Ask Form */}
      {showForm && (
        <AddAskForm
          clientId={clientId}
          onCancel={() => setShowForm(false)}
          onCreate={() => setShowForm(false)}
        />
      )}

      {/* ── Open filter: two direction sections ── */}
      {filter === 'open' && (
        activeAsks.length === 0
          ? <EmptyState filter="open" />
          : (
            <div className="space-y-4">
              <DirectionSection
                title="We owe them"
                colorScheme="zamp"
                asks={zampOwes}
                emptyText="Nothing pending from Zamp"
                onResolve={handleResolve}
                onMarkInProgress={handleMarkInProgress}
                resolving={updateAsk.isPending}
              />
              <DirectionSection
                title="Waiting on client"
                colorScheme="client"
                asks={clientOwes}
                emptyText="Nothing pending from client"
                onResolve={handleResolve}
                onMarkInProgress={handleMarkInProgress}
                resolving={updateAsk.isPending}
              />
            </div>
          )
      )}

      {/* ── Resolved / All filters: flat list as before ── */}
      {filter !== 'open' && (
        filtered.length === 0
          ? <EmptyState filter={filter} />
          : (
            <div className="space-y-3">
              {filtered.map(ask => (
                <AskCard
                  key={ask.id}
                  ask={ask}
                  onResolve={handleResolve}
                  onMarkInProgress={handleMarkInProgress}
                  resolving={updateAsk.isPending}
                />
              ))}
            </div>
          )
      )}
    </div>
  )
}
