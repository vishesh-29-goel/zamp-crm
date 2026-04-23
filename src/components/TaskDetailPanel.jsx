import { useState, useEffect } from 'react'
import {
  CheckCircle2, Clock, Circle, User, AlertTriangle,
  X, Calendar, Flag, History, Edit3
} from 'lucide-react'
import { useUpdateTask, useTaskHistory, useZampians } from '../lib/useApi'
import Spinner from './Spinner'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  open:        'bg-gray-100  text-gray-600',
  in_progress: 'bg-amber-100 text-amber-700',
  done:        'bg-green-100 text-green-700',
  blocked:     'bg-red-100   text-red-700',
}

const PRIORITY_COLOR = {
  high:     'bg-red-50   text-red-700   border-red-200',
  medium:   'bg-amber-50 text-amber-700 border-amber-200',
  low:      'bg-gray-50  text-gray-500  border-border',
  critical: 'bg-red-100  text-red-800   border-red-300',
}

const FIELD_LABELS = {
  status:       'Status',
  assignee_id:  'Assignee',
  due_date:     'Due date',
  priority:     'Priority',
  title:        'Title',
  description:  'Description',
  blocker_flag: 'Blocker',
  blocker_note: 'Blocker note',
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

function timeTo(due_date) {
  if (!due_date) return null
  const d = Math.floor((new Date(due_date) - Date.now()) / 86400000)
  if (d < 0)   return { label: `${Math.abs(d)}d overdue`, cls: 'text-red-600 font-semibold' }
  if (d === 0) return { label: 'Due today',    cls: 'text-amber-600 font-semibold' }
  if (d === 1) return { label: 'Due tomorrow', cls: 'text-amber-500' }
  return { label: `Due in ${d}d`, cls: 'text-gray-400' }
}

// ─── Panel ────────────────────────────────────────────────────────────────────

export default function TaskDetailPanel({ task, onClose }) {
  const { data: zampians = [] } = useZampians()
  const updateTask = useUpdateTask()
  const { data: history = [], isLoading: histLoading } = useTaskHistory(task?.id)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  useEffect(() => {
    if (!task) return
    setForm({
      title:        task.title        || '',
      description:  task.description  || '',
      assignee_id:  task.assignee_id  || '',
      due_date:     task.due_date     || '',
      priority:     task.priority     || 'medium',
      status:       task.status       || 'open',
      blocker_flag: task.blocker_flag || false,
      blocker_note: task.blocker_note || '',
    })
    setEditing(false)
  }, [task?.id])

  if (!task) return null

  const due = timeTo(task.due_date)

  function handleSave() {
    const body = {
      title:        form.title.trim()       || task.title,
      description:  form.description.trim() || null,
      assignee_id:  form.assignee_id  ? Number(form.assignee_id) : null,
      due_date:     form.due_date     || null,
      priority:     form.priority,
      status:       form.status,
      blocker_flag: form.blocker_flag,
      blocker_note: form.blocker_note || null,
    }
    updateTask.mutate({ id: task.id, ...body }, {
      onSuccess: () => setEditing(false)
    })
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex-1 pr-4">
            <p className="text-xs font-semibold text-zamp-600 mb-1">{task.client_name}</p>
            {editing ? (
              <input
                autoFocus
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full text-base font-semibold text-gray-900 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-zamp-500"
              />
            ) : (
              <h2 className="text-base font-semibold text-gray-900 leading-snug">{task.title}</h2>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => editing ? handleSave() : setEditing(true)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                editing
                  ? 'bg-zamp-600 text-white border-zamp-600 hover:bg-zamp-700'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
              disabled={updateTask.isPending}
            >
              <Edit3 className="w-3 h-3" />
              {updateTask.isPending ? 'Saving…' : editing ? 'Save' : 'Edit'}
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Status + Priority badges (view) / selects (edit) */}
          <div className="flex items-center gap-2 flex-wrap">
            {editing ? (
              <>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-zamp-500"
                >
                  {['open','in_progress','blocked','done'].map(s => (
                    <option key={s} value={s}>{s.replace('_',' ')}</option>
                  ))}
                </select>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-zamp-500"
                >
                  {['low','medium','high','critical'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[task.status] || STATUS_BADGE.open}`}>
                  {task.status?.replace('_', ' ')}
                </span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border capitalize ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.low}`}>
                  {task.priority}
                </span>
                {task.blocker_flag && (
                  <span className="text-xs font-semibold text-red-600 flex items-center gap-1 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                    <Flag className="w-3 h-3" /> Blocker
                  </span>
                )}
              </>
            )}
          </div>

          {/* Description */}
          {editing ? (
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1.5 block">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Add a description…"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500 resize-none"
              />
            </div>
          ) : (
            task.description
              ? <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
              : <p className="text-xs text-gray-400 italic">No description</p>
          )}

          {/* Blocker note (view) */}
          {task.blocker_flag && task.blocker_note && !editing && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-red-700 mb-1">Blocker note</p>
              <p className="text-sm text-red-600">{task.blocker_note}</p>
            </div>
          )}

          {/* Edit fields: assignee, due date, blocker */}
          {editing && (
            <div className="space-y-4">
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
                  <Calendar className="w-3 h-3" /> Due date
                </label>
                <input
                  type="date"
                  value={form.due_date || ''}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.blocker_flag}
                    onChange={e => setForm(f => ({ ...f, blocker_flag: e.target.checked }))}
                    className="w-4 h-4 rounded border-gray-300 text-zamp-600 focus:ring-zamp-500"
                  />
                  <span className="text-xs font-medium text-gray-600">Mark as blocker</span>
                </label>
              </div>
              {form.blocker_flag && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Blocker note</label>
                  <textarea
                    value={form.blocker_note}
                    onChange={e => setForm(f => ({ ...f, blocker_note: e.target.value }))}
                    rows={2}
                    placeholder="Describe the blocker..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500 resize-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* Meta: assignee + due date (view) */}
          {!editing && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Assignee
                </p>
                <p className="text-sm font-medium text-gray-800">{task.assignee_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Due date
                </p>
                <p className={`text-sm font-medium ${due ? due.cls : 'text-gray-800'}`}>
                  {task.due_date ? fmtDate(task.due_date) : '—'}
                </p>
              </div>
            </div>
          )}

          <div className="border-t border-gray-100" />

          {/* Activity */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Activity
            </p>
            {histLoading ? (
              <div className="flex justify-center py-4"><Spinner /></div>
            ) : history.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No changes recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {history.map(h => (
                  <div key={h.id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-gray-500">
                        {(h.changed_by_name || '?')[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">{h.changed_by_name || 'Someone'}</span>
                        {' changed '}
                        <span className="font-medium">{FIELD_LABELS[h.field_name] || h.field_name}</span>
                        {h.old_value && (
                          <> from <span className="line-through text-gray-400">{h.old_value}</span></>
                        )}
                        {' to '}
                        <span className="font-medium text-gray-900">{h.new_value ?? '—'}</span>
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{fmtDateTime(h.changed_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer save button */}
        {editing && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={handleSave}
              disabled={updateTask.isPending}
              className="flex-1 bg-zamp-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-zamp-700 disabled:opacity-50 transition-colors"
            >
              {updateTask.isPending ? 'Saving…' : 'Save changes'}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </>
  )
}
