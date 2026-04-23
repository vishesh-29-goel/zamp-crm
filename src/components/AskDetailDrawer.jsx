import { useState, useEffect } from 'react'
import {
  X, CheckCircle2, User, CalendarClock, Clock,
  AlertTriangle, Slack, Mic, MessageSquare, PenLine,
  Building2, Edit3,
} from 'lucide-react'
import { useUpdateAsk, useZampians } from '../lib/useApi'

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

function fmtDate(ts) {
  if (!ts) return '—'
  const [y, m, d] = ts.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function etaState(etaStr, status) {
  if (!etaStr) return null
  if (status === 'resolved' || status === 'wont_fix') return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const [y, m, d] = etaStr.split('T')[0].split('-').map(Number)
  const eta = new Date(y, m - 1, d)
  if (eta < today) return 'overdue'
  if (eta.getTime() === today.getTime()) return 'today'
  return 'upcoming'
}

function cleanAskText(text) {
  if (!text) return text
  return text
    .replace(/\s*\(Owner:[^)]*\)\s*$/i, '')
    .replace(/\s*\(Owner:[\s\S]*$/i, '')
    .replace(/\s+Owner:\s+[\s\S]*$/i, '')
    .trim()
}

// ── config ───────────────────────────────────────────────────────────────────

const SOURCE_CFG = {
  slack:  { label: 'Slack',  Icon: Slack,         cls: 'bg-purple-50 text-purple-600 border-purple-100' },
  avoma:  { label: 'Avoma',  Icon: Mic,           cls: 'bg-blue-50   text-blue-600   border-blue-100'   },
  email:  { label: 'Email',  Icon: MessageSquare, cls: 'bg-green-50  text-green-600  border-green-100'  },
  manual: { label: 'Manual', Icon: PenLine,        cls: 'bg-gray-100  text-gray-500   border-gray-200'   },
}

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'wont_fix']
const STATUS_CFG = {
  open:        { label: 'Open',        cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_progress: { label: 'In Progress', cls: 'bg-blue-100  text-blue-700  border-blue-200'  },
  resolved:    { label: 'Resolved',    cls: 'bg-green-100 text-green-700 border-green-200' },
  wont_fix:    { label: "Won't Fix",   cls: 'bg-gray-100  text-gray-500  border-gray-200'  },
}

// ── MetaRow ──────────────────────────────────────────────────────────────────

function MetaRow({ icon: Icon, label, value, valueCls = 'text-gray-800' }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-6 h-6 rounded-md bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${valueCls}`}>{value || '—'}</p>
      </div>
    </div>
  )
}

// ── AskDetailDrawer ──────────────────────────────────────────────────────────

export default function AskDetailDrawer({ ask, onClose }) {
  const updateAsk = useUpdateAsk()
  const { data: zampians = [] } = useZampians()
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({})

  useEffect(() => {
    if (!ask) return
    setForm({
      ask_text:    cleanAskText(ask.ask_text) || '',
      status:      ask.status      || 'open',
      assignee_id: ask.assignee_id || '',
      eta:         ask.eta ? ask.eta.split('T')[0] : '',
    })
    setEditing(false)
  }, [ask?.id])

  if (!ask) return null

  const src       = SOURCE_CFG[ask.source?.toLowerCase()] || SOURCE_CFG.manual
  const SrcIcon   = src.Icon
  const statusCfg = STATUS_CFG[ask.status] || STATUS_CFG.open
  const displayText = cleanAskText(ask.ask_text)
  const state     = etaState(ask.eta, ask.status)
  const isOpen    = ask.status === 'open' || ask.status === 'in_progress'

  const etaLabel = ask.eta ? fmtDate(ask.eta) : null
  const etaCls = state === 'overdue' ? 'text-red-600' : state === 'today' ? 'text-amber-600' : 'text-gray-800'

  function handleSave() {
    const body = {
      ask_text:    form.ask_text.trim() || ask.ask_text,
      status:      form.status,
      assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      eta:         form.eta || null,
    }
    updateAsk.mutate({ id: ask.id, ...body }, { onSuccess: () => setEditing(false) })
  }

  function handleResolve() {
    updateAsk.mutate({ id: ask.id, status: 'resolved' }, { onSuccess: onClose })
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusCfg.cls}`}>
                {statusCfg.label}
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${src.cls}`}>
                <SrcIcon className="w-3 h-3" />
                {src.label}
                {ask.source_channel && (
                  <span className="opacity-70">· #{ask.source_channel.replace(/^#/, '').replace(/^.*\//, '')}</span>
                )}
              </span>
            </div>
            <p className="text-[11px] font-semibold text-zamp-600 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> {ask.client_name || '—'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={updateAsk.isPending}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                editing
                  ? 'bg-zamp-600 text-white border-zamp-600 hover:bg-zamp-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              {updateAsk.isPending ? 'Saving…' : editing ? 'Save' : 'Edit'}
            </button>
            {editing && (
              <button
                onClick={() => setEditing(false)}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Ask text */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Ask</p>
            {editing ? (
              <textarea
                rows={4}
                value={form.ask_text}
                onChange={e => setForm(f => ({ ...f, ask_text: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-800 leading-relaxed">{displayText}</p>
            )}
          </div>

          <div className="border-t border-gray-100" />

          {/* Meta fields — view mode */}
          {!editing && (
            <div>
              <MetaRow icon={Building2}    label="Client"     value={ask.client_name} />
              <MetaRow icon={User}         label="Flagged by" value={ask.owner_name} />
              <MetaRow icon={User}         label="Assignee"   value={ask.assignee_name} />
              <MetaRow
                icon={CalendarClock}
                label="ETA"
                value={etaLabel ? `${etaLabel}${state === 'overdue' ? ' · Overdue' : state === 'today' ? ' · Today' : ''}` : null}
                valueCls={etaLabel ? etaCls : 'text-gray-400'}
              />
              <MetaRow icon={Clock} label="Raised" value={timeAgo(ask.raised_at)} />
            </div>
          )}

          {/* Edit fields */}
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500"
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{STATUS_CFG[s]?.label || s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                  <User className="w-3 h-3" /> Assignee
                </label>
                <select
                  value={form.assignee_id}
                  onChange={e => setForm(f => ({ ...f, assignee_id: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500"
                >
                  <option value="">Unassigned</option>
                  {zampians.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1">
                  <CalendarClock className="w-3 h-3" /> ETA
                </label>
                <input
                  type="date"
                  value={form.eta}
                  onChange={e => setForm(f => ({ ...f, eta: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        {editing ? (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={handleSave}
              disabled={updateAsk.isPending}
              className="flex-1 bg-zamp-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-zamp-700 disabled:opacity-50 transition-colors"
            >
              {updateAsk.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : isOpen ? (
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              onClick={handleResolve}
              disabled={updateAsk.isPending}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-xl disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              {updateAsk.isPending ? 'Resolving…' : 'Mark as Resolved'}
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}
