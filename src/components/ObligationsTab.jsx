import { useState, useMemo } from 'react'
import {
  CheckCircle2, Circle, Plus, Trash2, ChevronDown, ChevronUp,
  User, Building2, AlertTriangle, Calendar, X, Edit2, Check
} from 'lucide-react'
import {
  useObligations, useCreateObligation, useUpdateObligation, useDeleteObligation,
  useZampians,
} from '../lib/useApi'
import { toast } from 'sonner'

// ─────────────────────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────────────────────
const TODAY = new Date().toISOString().slice(0, 10)

function fmtDate(d) {
  if (!d) return null
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return d
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function dueState(d, status) {
  if (status === 'done' || status === 'cancelled') return null
  if (!d) return 'no-date'
  if (d < TODAY) return 'overdue'
  const diff = (new Date(d) - new Date(TODAY)) / 86400000
  if (diff <= 7) return 'due-soon'
  return 'future'
}
const DUE_STYLES = {
  overdue:   'text-red-600 bg-red-50 border-red-200',
  'due-soon':'text-amber-700 bg-amber-50 border-amber-200',
  future:    'text-gray-600 bg-gray-50 border-gray-200',
  'no-date': 'text-gray-400 bg-gray-50 border-gray-200',
}

// ─────────────────────────────────────────────────────────────────────────────
// Single row
// ─────────────────────────────────────────────────────────────────────────────
function ObligationRow({ o, clientId, zampians }) {
  const update = useUpdateObligation(clientId)
  const remove = useDeleteObligation(clientId)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    title: o.title,
    due_date: o.due_date || '',
    owner_id: o.owner_id || '',
    customer_owner: o.customer_owner || '',
  })
  const due = dueState(o.due_date, o.status)
  const isDone = o.status === 'done'

  const toggleStatus = () => update.mutate({ id: o.id, status: isDone ? 'open' : 'done' })

  const save = () => {
    const body = {
      title: draft.title.trim(),
      due_date: draft.due_date || null,
    }
    if (o.owner_side === 'internal') body.owner_id = draft.owner_id ? Number(draft.owner_id) : null
    else body.customer_owner = draft.customer_owner.trim() || null
    if (!body.title) { toast.error('Title required'); return }
    update.mutate({ id: o.id, ...body }, { onSuccess: () => setEditing(false) })
  }

  const ownerLabel = o.owner_side === 'internal'
    ? (o.owner_name || (o.owner_id ? `#${o.owner_id}` : 'Unassigned'))
    : (o.customer_owner || 'Client')

  if (editing) {
    return (
      <div className="border-l-2 border-blue-400 bg-blue-50/50 rounded-r-md p-3 space-y-2">
        <input
          autoFocus
          className="w-full text-[14px] font-medium px-2 py-1 border border-gray-300 rounded bg-white focus:border-blue-500 focus:outline-none"
          value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })}
        />
        <div className="flex items-center gap-2 text-[12px]">
          <input
            type="date"
            className="px-2 py-1 border border-gray-300 rounded bg-white"
            value={draft.due_date}
            onChange={e => setDraft({ ...draft, due_date: e.target.value })}
          />
          {o.owner_side === 'internal' ? (
            <select
              className="px-2 py-1 border border-gray-300 rounded bg-white flex-1"
              value={draft.owner_id}
              onChange={e => setDraft({ ...draft, owner_id: e.target.value })}
            >
              <option value="">Unassigned</option>
              {(zampians || []).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          ) : (
            <input
              className="px-2 py-1 border border-gray-300 rounded bg-white flex-1"
              placeholder="Client owner (optional)"
              value={draft.customer_owner}
              onChange={e => setDraft({ ...draft, customer_owner: e.target.value })}
            />
          )}
          <button onClick={save} className="px-3 py-1 bg-gray-900 text-white rounded text-[12px] font-medium hover:bg-gray-700">Save</button>
          <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4"/></button>
        </div>
      </div>
    )
  }

  return (
    <div className={`group flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-gray-50 transition ${isDone ? 'opacity-60' : ''}`}>
      <button
        onClick={toggleStatus}
        className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-emerald-600 transition"
        title={isDone ? 'Mark open' : 'Mark done'}
      >
        {isDone
          ? <CheckCircle2 className="w-[18px] h-[18px] text-emerald-600"/>
          : <Circle className="w-[18px] h-[18px]"/>
        }
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-[14px] leading-snug ${isDone ? 'line-through text-gray-500' : 'text-gray-900'}`}>
          {o.title}
        </div>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
            <User className="w-3 h-3"/>
            {ownerLabel}
          </span>
          {o.due_date && (
            <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border ${DUE_STYLES[due] || ''}`}>
              {due === 'overdue' && <AlertTriangle className="w-3 h-3"/>}
              <Calendar className="w-3 h-3"/>
              {fmtDate(o.due_date)}
              {due === 'overdue' && <span className="font-semibold ml-0.5">overdue</span>}
            </span>
          )}
          {o.source_kind !== 'manual' && (
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              from {o.source_kind === 'task' ? 'task' : o.source_kind === 'ask' ? 'meeting ask' : 'commitment'}
            </span>
          )}
        </div>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
        <button onClick={() => setEditing(true)} className="p-1 text-gray-400 hover:text-gray-700" title="Edit">
          <Edit2 className="w-3.5 h-3.5"/>
        </button>
        <button
          onClick={() => { if (confirm('Delete this obligation?')) remove.mutate(o.id) }}
          className="p-1 text-gray-400 hover:text-red-600" title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5"/>
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline add bar
// ─────────────────────────────────────────────────────────────────────────────
function AddRow({ clientId, ownerSide, zampians }) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState({ title: '', due_date: '', owner_id: '', customer_owner: '' })
  const create = useCreateObligation(clientId)

  const submit = () => {
    if (!draft.title.trim()) return
    const body = { owner_side: ownerSide, title: draft.title.trim(), due_date: draft.due_date || null }
    if (ownerSide === 'internal') body.owner_id = draft.owner_id ? Number(draft.owner_id) : null
    else body.customer_owner = draft.customer_owner.trim() || null
    create.mutate(body, {
      onSuccess: () => { setDraft({ title: '', due_date: '', owner_id: '', customer_owner: '' }); setOpen(false) }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-700 rounded-md transition"
      >
        <Plus className="w-4 h-4"/>
        Add {ownerSide === 'internal' ? 'something we owe' : 'something they owe'}
      </button>
    )
  }

  return (
    <div className="border border-blue-300 bg-white rounded-md p-3 space-y-2">
      <input
        autoFocus
        placeholder="What needs doing?"
        className="w-full text-[14px] px-2 py-1.5 border border-gray-300 rounded bg-white focus:border-blue-500 focus:outline-none"
        value={draft.title}
        onChange={e => setDraft({ ...draft, title: e.target.value })}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false) }}
      />
      <div className="flex items-center gap-2 text-[12px]">
        <input
          type="date"
          className="px-2 py-1 border border-gray-300 rounded bg-white"
          value={draft.due_date}
          onChange={e => setDraft({ ...draft, due_date: e.target.value })}
        />
        {ownerSide === 'internal' ? (
          <select
            className="px-2 py-1 border border-gray-300 rounded bg-white flex-1"
            value={draft.owner_id}
            onChange={e => setDraft({ ...draft, owner_id: e.target.value })}
          >
            <option value="">Unassigned</option>
            {(zampians || []).map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        ) : (
          <input
            className="px-2 py-1 border border-gray-300 rounded bg-white flex-1"
            placeholder="Owner at client (optional)"
            value={draft.customer_owner}
            onChange={e => setDraft({ ...draft, customer_owner: e.target.value })}
          />
        )}
        <button onClick={submit} className="px-3 py-1 bg-gray-900 text-white rounded text-[12px] font-medium hover:bg-gray-700">Add</button>
        <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4"/></button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Column
// ─────────────────────────────────────────────────────────────────────────────
function Column({ title, icon: Icon, accent, items, clientId, ownerSide, zampians }) {
  const [showDone, setShowDone] = useState(false)
  const open = useMemo(() => items.filter(o => o.status === 'open'), [items])
  const done = useMemo(() => items.filter(o => o.status !== 'open'), [items])
  const overdue = open.filter(o => dueState(o.due_date, o.status) === 'overdue').length

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className={`px-4 py-3 border-b border-gray-200 ${accent.header}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${accent.icon}`}/>
            <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wide">{title}</h3>
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-semibold ${accent.badge}`}>{open.length}</span>
          </div>
          {overdue > 0 && (
            <span className="text-[11px] text-red-600 font-semibold inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3"/>{overdue} overdue
            </span>
          )}
        </div>
      </div>

      <div className="p-2">
        {open.length === 0
          ? <div className="px-3 py-6 text-center text-[12px] text-gray-400">Nothing open here. Nice.</div>
          : <div className="space-y-0.5">{open.map(o => <ObligationRow key={o.id} o={o} clientId={clientId} zampians={zampians}/>)}</div>
        }
        <div className="mt-1 pt-1 border-t border-gray-100">
          <AddRow clientId={clientId} ownerSide={ownerSide} zampians={zampians}/>
        </div>

        {done.length > 0 && (
          <>
            <button
              onClick={() => setShowDone(s => !s)}
              className="w-full flex items-center justify-center gap-1 mt-2 px-3 py-1.5 text-[11px] text-gray-500 hover:text-gray-700 transition"
            >
              {showDone ? <ChevronUp className="w-3 h-3"/> : <ChevronDown className="w-3 h-3"/>}
              {showDone ? 'Hide' : 'Show'} {done.length} completed
            </button>
            {showDone && (
              <div className="mt-1 space-y-0.5 border-t border-gray-100 pt-1">
                {done.map(o => <ObligationRow key={o.id} o={o} clientId={clientId} zampians={zampians}/>)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main tab component
// ─────────────────────────────────────────────────────────────────────────────
export default function ObligationsTab({ clientId }) {
  const { data: items = [], isLoading, error } = useObligations(clientId)
  const { data: zampians = [] } = useZampians()

  const internal = useMemo(() => items.filter(o => o.owner_side === 'internal'), [items])
  const customer = useMemo(() => items.filter(o => o.owner_side === 'customer'), [items])

  if (isLoading) return <div className="text-[13px] text-gray-500">Loading…</div>
  if (error)     return <div className="text-[13px] text-red-600">Failed to load obligations.</div>

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Column
        title="What we owe"
        icon={Building2}
        accent={{ header:'bg-blue-50/50', icon:'text-blue-600', badge:'bg-blue-100 text-blue-700' }}
        items={internal}
        clientId={clientId}
        ownerSide="internal"
        zampians={zampians}
      />
      <Column
        title="What they owe"
        icon={User}
        accent={{ header:'bg-amber-50/50', icon:'text-amber-600', badge:'bg-amber-100 text-amber-700' }}
        items={customer}
        clientId={clientId}
        ownerSide="customer"
        zampians={zampians}
      />
    </div>
  )
}
