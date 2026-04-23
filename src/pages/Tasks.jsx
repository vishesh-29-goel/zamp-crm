import { useState, useMemo, useEffect } from 'react'
import {
  CheckCircle2, Clock, Circle, User, ChevronDown,
  AlertTriangle, X, Calendar, Flag, Tag, History, Edit3
} from 'lucide-react'
import { useTasks, useZampians, useUpdateTask } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import Spinner from '../components/Spinner'
import TaskDetailPanel from '../components/TaskDetailPanel'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CYCLE      = { open: 'in_progress', in_progress: 'done', done: 'open', blocked: 'open' }
const STATUS_NEXT_LABEL = { open: 'Start', in_progress: 'Mark done', done: 'Reopen', blocked: 'Unblock' }
const STATUS_NEXT_CLS   = {
  open:        'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  in_progress: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  done:        'bg-gray-50  text-gray-500  border-border    hover:bg-surface-page',
  blocked:     'bg-blue-50  text-blue-700  border-blue-200  hover:bg-blue-100',
}
const PRIORITY_COLOR = {
  high:     'bg-red-50   text-red-700   border-red-200',
  medium:   'bg-amber-50 text-amber-700 border-amber-200',
  low:      'bg-gray-50  text-gray-500  border-border',
  critical: 'bg-red-100  text-red-800   border-red-300',
}
const STATUS_CONFIG = {
  open:        { label: 'Open',        icon: Circle,        header: 'bg-gray-50  border-border',    dot: 'bg-gray-400'  },
  in_progress: { label: 'In Progress', icon: Clock,         header: 'bg-amber-50 border-amber-200', dot: 'bg-amber-400' },
  blocked:     { label: 'Blocked',     icon: AlertTriangle, header: 'bg-red-50   border-red-200',   dot: 'bg-red-400'   },
  done:        { label: 'Done',        icon: CheckCircle2,  header: 'bg-green-50 border-green-200', dot: 'bg-green-400' },
}
const STATUS_BADGE = {
  open:        'bg-gray-100  text-gray-600',
  in_progress: 'bg-amber-100 text-amber-700',
  done:        'bg-green-100 text-green-700',
  blocked:     'bg-red-100   text-red-700',
}

function timeTo(due_date) {
  if (!due_date) return null
  const d = Math.floor((new Date(due_date) - Date.now()) / 86400000)
  if (d < 0)   return { label: `${Math.abs(d)}d overdue`, cls: 'text-red-600 font-semibold' }
  if (d === 0) return { label: 'Due today',    cls: 'text-amber-600 font-semibold' }
  if (d === 1) return { label: 'Due tomorrow', cls: 'text-amber-500' }
  return { label: `Due in ${d}d`, cls: 'text-gray-400' }
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

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onOpen }) {
  const due        = timeTo(task.due_date)
  const updateTask = useUpdateTask()
  const [localStatus, setLocalStatus] = useState(task.status)

  function cycleStatus(e) {
    e.stopPropagation()
    const next = STATUS_CYCLE[localStatus] || 'open'
    setLocalStatus(next)
    updateTask.mutate({ id: task.id, status: next })
  }

  return (
    <div
      onClick={() => onOpen(task)}
      className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md hover:border-zamp-200 transition-all
        ${localStatus === 'done' ? 'opacity-60' : 'border-border-subtle'}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className={`text-sm font-medium leading-snug flex-1 ${localStatus === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
          {task.title}
        </p>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.low}`}>
          {task.priority}
        </span>
      </div>
      <p className="text-xs text-zamp-600 font-medium mb-2">{task.client_name}</p>
      {task.description && <p className="text-xs text-gray-500 leading-relaxed mb-2 line-clamp-2">{task.description}</p>}
      {task.blocker_flag && (
        <p className="text-xs text-red-600 font-medium mb-2">🚫 {task.blocker_note || 'Blocker'}</p>
      )}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <User className="w-3 h-3" />
          {task.assignee_name || 'Unassigned'}
        </div>
        {due && <span className={`text-xs ${due.cls}`}>{due.label}</span>}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-50">
        <button
          onClick={cycleStatus}
          disabled={updateTask.isPending}
          className={`w-full text-xs font-medium py-1.5 rounded-lg border transition-colors disabled:opacity-50 ${STATUS_NEXT_CLS[localStatus] || STATUS_NEXT_CLS.open}`}
        >
          {updateTask.isPending ? '…' : STATUS_NEXT_LABEL[localStatus]}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { zampianId }                   = useAuth()
  const { data: tasks = [], isLoading } = useTasks()
  const { data: zampians = [] }         = useZampians()
  const [assigneeId, setAssigneeId]     = useState(() => zampianId ? String(zampianId) : 'all')
  const [selectedTask, setSelectedTask] = useState(null)

  const filtered = useMemo(() =>
    assigneeId === 'all' ? tasks : tasks.filter(t => String(t.assignee_id) === assigneeId)
  , [tasks, assigneeId])

  const byStatus = {
    open:        filtered.filter(t => t.status === 'open'),
    in_progress: filtered.filter(t => t.status === 'in_progress'),
    blocked:     filtered.filter(t => t.status === 'blocked'),
    done:        filtered.filter(t => t.status === 'done'),
  }

  if (isLoading) return <div className="flex items-center justify-center h-96"><Spinner /></div>

  return (
    <>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filtered.filter(t => t.status !== 'done').length} open · {filtered.filter(t => t.status === 'done').length} done
            </p>
          </div>
          <div className="relative">
            <select
              value={assigneeId}
              onChange={e => setAssigneeId(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2 text-sm border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-zamp-500 cursor-pointer text-gray-700"
            >
              <option value="all">All assignees</option>
              {zampians.map(z => <option key={z.id} value={String(z.id)}>{z.name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {Object.entries(byStatus).map(([status, taskList]) => {
            const cfg  = STATUS_CONFIG[status]
            return (
              <div key={status}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border mb-3 ${cfg.header}`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
                  <span className="ml-auto text-xs text-gray-400">{taskList.length}</span>
                </div>
                <div className="space-y-3">
                  {taskList.map(t => (
                    <TaskCard key={t.id} task={t} onOpen={setSelectedTask} />
                  ))}
                  {taskList.length === 0 && (
                    <div className="border-2 border-dashed border-gray-100 rounded-xl py-8 text-center">
                      <p className="text-xs text-gray-400">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Task detail slide-over */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  )
}
