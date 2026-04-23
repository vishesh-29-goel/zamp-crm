import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, AlertTriangle, ChevronDown,
  Users, Target, MessageSquare, TrendingUp, Zap, CheckCheck, AlertCircle,
  CircleDot, FileText, Flag, Sparkles, Mail, Phone, Globe,
  Building2, User, Star, ArrowRight, CornerDownRight, ExternalLink,
  ChevronRight, Circle, Hash, Tag
} from 'lucide-react'
import {
  useClient, useMilestones, useTasks, useAsks, useMeetings, useMeeting,
  useCommitments, useSignals, useStakeholders,
  useUpdateTask, useUpdateAsk, useUpdateCommitment, useUpdateSignal
} from '../lib/useApi'
import HealthBadge from '../components/HealthBadge'
import StageBadge from '../components/StageBadge'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import TaskDetailPanel from '../components/TaskDetailPanel'

/* ─── tiny helpers ──────────────────────────────────────────────── */
const fmtDate  = d => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : null
const fmtShort = d => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : null
const fmtRel   = d => {
  if (!d) return null
  const days = Math.floor((Date.now() - new Date(d)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <  7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days/7)}w ago`
  return fmtShort(d)
}
const daysFrom = d => d ? Math.floor((new Date(d) - Date.now()) / 86400000) : null
const fmtMoney = n => n != null ? `$${Number(n).toLocaleString()}` : null
const pct      = v => v != null ? Math.round(Number(v) * 100) : null

/* ─── atoms ─────────────────────────────────────────────────────── */
const Empty = ({ title, sub }) => (
  <div className="py-16 text-center">
    <p className="text-sm font-medium text-gray-400">{title}</p>
    {sub && <p className="text-xs text-gray-300 mt-1">{sub}</p>}
  </div>
)

function StatusBadge({ status }) {
  const map = {
    open:'bg-blue-50 text-blue-700', in_progress:'bg-amber-50 text-amber-700',
    done:'bg-emerald-50 text-emerald-700', completed:'bg-emerald-50 text-emerald-700',
    cancelled:'bg-gray-100 text-gray-400', pending:'bg-gray-100 text-gray-600',
    resolved:'bg-emerald-50 text-emerald-700', dismissed:'bg-gray-100 text-gray-400',
    at_risk:'bg-red-50 text-red-600', fulfilled:'bg-emerald-50 text-emerald-700',
  }
  const label = {
    open:'Open', in_progress:'In Progress', done:'Done', completed:'Completed',
    cancelled:'Cancelled', pending:'Pending', resolved:'Resolved',
    dismissed:'Dismissed', at_risk:'At Risk', fulfilled:'Fulfilled',
  }
  return (
    <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {label[status] || status}
    </span>
  )
}

function PriorityDot({ priority }) {
  if (!priority) return null
  const c = { critical:'bg-red-500', high:'bg-orange-400', medium:'bg-amber-400', low:'bg-gray-300' }
  return <span title={priority} className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${c[priority] || 'bg-gray-300'}`} />
}

function DuePill({ date, status }) {
  if (!date || ['done','completed','cancelled','resolved','fulfilled'].includes(status)) return null
  const d = daysFrom(date)
  if (d == null) return null
  if (d <  0) return <span className="text-[11px] font-bold text-red-600">{Math.abs(d)}d overdue</span>
  if (d === 0) return <span className="text-[11px] font-semibold text-amber-600">Due today</span>
  if (d <= 3)  return <span className="text-[11px] font-medium text-amber-500">Due in {d}d</span>
  return <span className="text-[11px] text-gray-400">Due {fmtShort(date)}</span>
}

function Chip({ children, color='gray', size='sm' }) {
  const cls = {
    gray:'bg-gray-100 text-gray-600', blue:'bg-blue-50 text-blue-700',
    purple:'bg-purple-50 text-purple-700', green:'bg-emerald-50 text-emerald-700',
    amber:'bg-amber-50 text-amber-700', red:'bg-red-50 text-red-700',
    teal:'bg-teal-50 text-teal-700', orange:'bg-orange-50 text-orange-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cls[color]||cls.gray}`}>
      {children}
    </span>
  )
}

function Avatar({ name, size='sm' }) {
  const init = (name||'?').trim().split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase()
  const sz = size==='sm' ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
  return <div className={`${sz} rounded-full bg-zamp-100 text-zamp-700 font-bold flex items-center justify-center flex-shrink-0`}>{init}</div>
}

function SourceEvidence({ sources }) {
  if (!sources?.length) return null
  return (
    <div className="mt-2 space-y-1">
      {sources.map((s, i) => (
        <div key={i} className="flex items-start gap-1.5 text-[11px] text-gray-500 bg-gray-50 rounded-md px-2.5 py-1.5">
          <CornerDownRight size={10} className="mt-0.5 flex-shrink-0 text-gray-300" />
          <div>
            <span className={`font-semibold mr-1.5 ${s.type==='meeting'?'text-blue-500':s.type==='slack'?'text-purple-500':'text-gray-400'}`}>
              {s.type}{s.date && ` · ${fmtShort(s.date)}`}
            </span>
            {s.excerpt}
          </div>
        </div>
      ))}
    </div>
  )
}

function ConfidenceBar({ value }) {
  const p = pct(value)
  if (p == null) return null
  const color = p >= 80 ? 'bg-emerald-400' : p >= 50 ? 'bg-amber-400' : 'bg-red-400'
  return (
    <span className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{width:`${p}%`}} />
      </div>
      <span className="text-[10px] text-gray-400">{p}%</span>
    </span>
  )
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-6 sticky top-0 z-10 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)}
          className={`relative flex items-center gap-1.5 px-3.5 py-3.5 text-[13px] font-medium transition-all whitespace-nowrap flex-shrink-0 ${
            active === t.key
              ? 'text-zamp-600 border-b-2 border-zamp-500 -mb-px'
              : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
          }`}
        >
          {t.icon && <t.icon size={13} />}
          {t.label}
          {t.count > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
              active === t.key ? 'bg-zamp-50 text-zamp-600' : 'bg-gray-100 text-gray-500'
            }`}>{t.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

function FilterBar({ opts, active, onChange }) {
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {opts.map(o => (
        <button key={o.key} onClick={() => onChange(o.key)}
          className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all ${
            active === o.key
              ? 'bg-gray-900 text-white border-gray-900'
              : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
          }`}>
          {o.label}
          {o.count > 0 && <span className={`ml-1.5 font-normal ${active===o.key?'text-gray-400':'text-gray-400'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ─── CLIENT HEADER ─────────────────────────────────────────────── */
function ClientHeader({ client }) {
  const init = (client.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 pt-4 pb-0">
        <Link to="/clients" className="inline-flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600 mb-3 transition-colors">
          <ArrowLeft size={12}/> All Clients
        </Link>
        <div className="flex items-start justify-between gap-4 pb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zamp-400 to-zamp-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm">
              {init}
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-gray-900 leading-tight">{client.name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <StageBadge stage={client.stage} />
                <HealthBadge health={client.health} />
                {client.pod_name && <span className="text-[12px] text-gray-400 font-medium">{client.pod_name}</span>}
                {client.arr != null && <span className="text-[13px] font-bold text-gray-700">{fmtMoney(client.arr)}<span className="text-[11px] font-normal text-gray-400 ml-0.5">ARR</span></span>}
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0 pt-1">
            {client.ae_name  && <p className="text-[12px] text-gray-500">AE: <span className="font-semibold text-gray-700">{client.ae_name}</span></p>}
            {client.csm_name && <p className="text-[12px] text-gray-500 mt-0.5">CSM: <span className="font-semibold text-gray-700">{client.csm_name}</span></p>}
            {client.gm_name  && <p className="text-[12px] text-gray-500 mt-0.5">GM: <span className="font-semibold text-gray-700">{client.gm_name}</span></p>}
          </div>
        </div>
        {/* meta strip */}
        <div className="flex flex-wrap gap-4 py-2.5 border-t border-gray-100">
          {client.industry && (
            <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <Building2 size={12} className="text-gray-300"/>{client.industry}
            </span>
          )}
          {client.website && (
            <a href={client.website} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-[12px] text-zamp-500 hover:text-zamp-700">
              <Globe size={12}/>{client.website.replace(/^https?:\/\//,'')}
            </a>
          )}
          {client.go_live_date && (
            <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <Calendar size={12} className="text-gray-300"/>Live {fmtShort(client.go_live_date)}
            </span>
          )}
          {client.contract_start && (
            <span className="flex items-center gap-1.5 text-[12px] text-gray-500">
              <FileText size={12} className="text-gray-300"/>Contract {fmtShort(client.contract_start)}
            </span>
          )}
          {client.updated_at && (
            <span className="flex items-center gap-1.5 text-[12px] text-gray-400 ml-auto">
              Updated {fmtRel(client.updated_at)}
            </span>
          )}
        </div>
        {client.notes && (
          <p className="text-[13px] text-gray-600 leading-relaxed bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">{client.notes}</p>
        )}
      </div>
    </div>
  )
}

/* ─── OVERVIEW TAB ──────────────────────────────────────────────── */
function OverviewTab({ client, milestones, signals, tasks, asks }) {
  const openTasks = (tasks||[]).filter(t => !['done','completed','cancelled'].includes(t.status))
  const openAsks  = (asks||[]).filter(a => a.status === 'open')
  const nextMile  = (milestones||[])
    .filter(m => !m.completed_at)
    .sort((a,b) => new Date(a.due_date||'2099') - new Date(b.due_date||'2099'))[0]
  const criticalSignals = (signals||[]).filter(s => s.metadata?.severity === 'critical' || s.metadata?.severity === 'high')

  return (
    <div className="grid grid-cols-3 gap-5 p-6">
      {/* left col: summary + next milestone */}
      <div className="col-span-2 space-y-4">
        {/* stat row */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label:'Open Tasks',    val: openTasks.length,   icon: CheckCircle2,  color:'blue' },
            { label:'Open Asks',     val: openAsks.length,    icon: MessageSquare, color:'amber' },
            { label:'Signals',       val: (signals||[]).length, icon: Zap,         color:'purple' },
            { label:'Milestones',    val: (milestones||[]).length, icon: Target,   color:'green' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3.5 text-center">
              <div className={`text-2xl font-bold ${s.color==='blue'?'text-blue-600':s.color==='amber'?'text-amber-600':s.color==='purple'?'text-purple-600':'text-emerald-600'}`}>
                {s.val}
              </div>
              <div className="text-[11px] text-gray-400 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* next milestone */}
        {nextMile && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Next Milestone</p>
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold text-gray-800">{nextMile.milestone_name}</span>
              <div className="flex items-center gap-2">
                <StatusBadge status={nextMile.status} />
                <DuePill date={nextMile.due_date} status={nextMile.status} />
              </div>
            </div>
          </div>
        )}

        {/* open tasks preview */}
        {openTasks.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Open Tasks</p>
              <span className="text-[11px] text-gray-400">{openTasks.length}</span>
            </div>
            {openTasks.slice(0,4).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0">
                <PriorityDot priority={t.priority} />
                <span className="text-[13px] text-gray-700 flex-1 truncate">{t.title}</span>
                {t.assignee_name && <span className="text-[11px] text-gray-400 flex-shrink-0">{t.assignee_name}</span>}
                <DuePill date={t.due_date} status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* right col: critical signals + open asks */}
      <div className="space-y-4">
        {criticalSignals.length > 0 && (
          <div className="bg-white border border-red-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-red-100 bg-red-50">
              <p className="text-[12px] font-semibold text-red-600 flex items-center gap-1.5">
                <AlertTriangle size={12}/> Critical Signals
              </p>
            </div>
            {criticalSignals.slice(0,3).map(s => (
              <div key={s.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <p className="text-[12px] font-semibold text-gray-700 capitalize">{(s.signal_type||'').replace(/_/g,' ')}</p>
                <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2">{s.signal_text}</p>
              </div>
            ))}
          </div>
        )}

        {openAsks.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">Open Asks</p>
            </div>
            {openAsks.slice(0,4).map(a => (
              <div key={a.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                <p className="text-[12px] font-medium text-gray-700 line-clamp-2">{a.ask_text}</p>
                {a.owner_name && <p className="text-[11px] text-gray-400 mt-1">{a.owner_name}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── MILESTONES TAB ────────────────────────────────────────────── */
function MilestonesTab({ clientId }) {
  const { data: milestones, isLoading, error } = useMilestones(clientId)
  const [filter, setFilter] = useState('all')

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>
  if (error) return <ErrorMessage message={error.message} />

  const items = (milestones||[])
  const filtered = filter === 'all' ? items
    : filter === 'pending' ? items.filter(m => !m.completed_at && m.status !== 'cancelled')
    : items.filter(m => m.completed_at)

  return (
    <div className="p-6">
      <FilterBar
        opts={[
          { key:'all',     label:'All',       count: items.length },
          { key:'pending', label:'Pending',   count: items.filter(m=>!m.completed_at && m.status!=='cancelled').length },
          { key:'done',    label:'Completed', count: items.filter(m=>!!m.completed_at).length },
        ]}
        active={filter} onChange={setFilter}
      />
      {filtered.length === 0 ? <Empty title="No milestones" sub="Add milestones to track key deliverables" /> : (
        <div className="space-y-2">
          {filtered.map(m => {
            const done = !!m.completed_at
            const overdue = !done && m.due_date && daysFrom(m.due_date) < 0
            return (
              <div key={m.id} className={`bg-white border rounded-xl p-4 flex items-start gap-4 ${overdue ? 'border-red-200' : 'border-gray-200'}`}>
                <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  done ? 'bg-emerald-500 border-emerald-500' : overdue ? 'border-red-300' : 'border-gray-300'
                }`}>
                  {done && <CheckCheck size={11} className="text-white"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-[14px] font-semibold ${done ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {m.milestone_name}
                    </p>
                    <StatusBadge status={m.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5">
                    {m.due_date && (
                      <span className={`text-[12px] flex items-center gap-1 ${overdue?'text-red-500 font-semibold':'text-gray-400'}`}>
                        <Calendar size={11}/> Due {fmtDate(m.due_date)}
                      </span>
                    )}
                    {m.completed_at && (
                      <span className="text-[12px] text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={11}/> Completed {fmtDate(m.completed_at)}
                      </span>
                    )}
                    {m.owner_name && (
                      <span className="text-[12px] text-gray-400 flex items-center gap-1">
                        <User size={11}/>{m.owner_name}
                      </span>
                    )}
                  </div>
                  {m.description && <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed">{m.description}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── TASKS TAB ─────────────────────────────────────────────────── */
const PRIORITY_BADGE = {
  critical: 'bg-red-50 text-red-600 border border-red-200',
  high:     'bg-orange-50 text-orange-600 border border-orange-200',
  medium:   'bg-amber-50 text-amber-600 border border-amber-200',
  low:      'bg-gray-100 text-gray-500',
}

function TaskCard({ t, onOpen }) {
  const updateTask = useUpdateTask()
  const isDone    = ['done','completed'].includes(t.status)
  const isOverdue = !isDone && t.due_date && daysFrom(t.due_date) < 0

  const cycleStatus = (e) => {
    e.stopPropagation()
    const cycle = { open:'in_progress', in_progress:'done', done:'open', completed:'open' }
    updateTask.mutate({ id: t.id, status: cycle[t.status] || 'open' })
  }

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden transition-shadow hover:shadow-sm cursor-pointer ${
        t.blocker_flag ? 'border-red-200' : isOverdue ? 'border-amber-200' : 'border-gray-200'
      }`}
      onClick={() => onOpen(t)}
    >
      <div className="px-4 py-3.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <PriorityDot priority={t.priority} />
          <p className={`text-[13.5px] font-semibold flex-1 min-w-0 leading-snug ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {t.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            {t.blocker_flag && (
              <span className="text-[11px] font-semibold text-red-500 flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                <Flag size={9}/>Blocker
              </span>
            )}
            <button onClick={cycleStatus} title="Advance status" className="transition-opacity hover:opacity-70">
              <StatusBadge status={t.status} />
            </button>
            <DuePill date={t.due_date} status={t.status} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 mt-1.5 ml-4">
          {t.assignee_name && (
            <span className="flex items-center gap-1 text-[12px] text-gray-500">
              <User size={11} className="text-gray-300"/>
              <span className="font-medium text-gray-600">{t.assignee_name}</span>
            </span>
          )}
          {t.priority && (
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.low}`}>
              {t.priority}
            </span>
          )}
          {t.description && (
            <span className="text-[11px] text-gray-400 truncate max-w-[200px]">{t.description}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function TasksTab({ clientId }) {
  const { data: tasks, isLoading, error } = useTasks({ client_id: clientId })
  const [filter, setFilter] = useState('open')
  const [selectedTask, setSelectedTask] = useState(null)

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>
  if (error) return <ErrorMessage message={error.message} />

  const items = (tasks||[])
  const filterMap = {
    open:    items.filter(t => !['done','completed','cancelled'].includes(t.status)),
    done:    items.filter(t => ['done','completed'].includes(t.status)),
    blocker: items.filter(t => t.blocker_flag),
    all:     items,
  }

  return (
    <>
      <div className="p-6">
        <FilterBar
          opts={[
            { key:'open',    label:'Open',     count: filterMap.open.length },
            { key:'blocker', label:'Blockers', count: filterMap.blocker.length },
            { key:'done',    label:'Done',     count: filterMap.done.length },
            { key:'all',     label:'All',      count: items.length },
          ]}
          active={filter} onChange={setFilter}
        />
        {(filterMap[filter]||[]).length === 0
          ? <Empty title="No tasks" sub="Nothing in this filter" />
          : (
            <div className="space-y-2">
              {(filterMap[filter]||[]).map(t => (
                <TaskCard key={t.id} t={t} onOpen={setSelectedTask} />
              ))}
            </div>
          )
        }
      </div>
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </>
  )
}

/* ─── SIGNALS TAB ───────────────────────────────────────────────── */
const SIGNAL_COLORS = {
  critical: { dot:'bg-red-500',    chip:'red',    label:'Critical' },
  high:     { dot:'bg-orange-400', chip:'orange', label:'High' },
  medium:   { dot:'bg-amber-400',  chip:'amber',  label:'Medium' },
  low:      { dot:'bg-gray-300',   chip:'gray',   label:'Low' },
}

function SignalCard({ s, onDismiss }) {
  const [expanded, setExpanded] = useState(false)
  const sev = s.metadata?.severity || 'low'
  const sc  = SIGNAL_COLORS[sev] || SIGNAL_COLORS.low
  const sources = Array.isArray(s.sources) ? s.sources : (s.sources ? [s.sources] : [])

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[12px] font-bold text-gray-500 uppercase tracking-wider">
                {(s.signal_type||'').replace(/_/g,' ')}
              </span>
              <Chip color={sc.chip}>{sc.label}</Chip>
              {s.status && <StatusBadge status={s.status}/>}
              <ConfidenceBar value={s.confidence} />
            </div>
            <p className="text-[14px] font-semibold text-gray-800 leading-snug">{s.signal_text}</p>
            {s.metadata?.description && (
              <p className="text-[12px] text-gray-500 mt-1.5 leading-relaxed">{s.metadata.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {sources.length > 0 && (
              <button onClick={() => setExpanded(!expanded)}
                className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50">
                <CornerDownRight size={11}/>{sources.length} source{sources.length>1?'s':''}
                <ChevronDown size={11} className={`transition-transform ${expanded?'rotate-180':''}`}/>
              </button>
            )}
            {s.status !== 'dismissed' && (
              <button onClick={() => onDismiss(s.id)}
                className="text-[11px] text-gray-300 hover:text-gray-500 px-2 py-1 rounded hover:bg-gray-50">
                Dismiss
              </button>
            )}
          </div>
        </div>
        {expanded && <SourceEvidence sources={sources} />}
      </div>
      {s.created_at && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <span className="text-[11px] text-gray-400">{fmtRel(s.created_at)}</span>
          {s.metadata?.action_required && (
            <span className="text-[11px] font-semibold text-amber-600 flex items-center gap-1">
              <AlertCircle size={11}/>Action required
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SignalsTab({ clientId }) {
  const { data: signals, isLoading, error } = useSignals({ client_id: clientId })
  const updateSignal = useUpdateSignal()
  const [filter, setFilter] = useState('active')

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>
  if (error) return <ErrorMessage message={error.message} />

  const items = (signals||[])
  const active = items.filter(s => s.status !== 'dismissed')
  const dismissed = items.filter(s => s.status === 'dismissed')
  const bySev = sev => active.filter(s => s.metadata?.severity === sev)

  const onDismiss = (id) => updateSignal.mutate({ id, status:'dismissed' })

  return (
    <div className="p-6">
      <FilterBar
        opts={[
          { key:'active',    label:'Active',    count: active.length },
          { key:'critical',  label:'Critical',  count: bySev('critical').length },
          { key:'high',      label:'High',      count: bySev('high').length },
          { key:'dismissed', label:'Dismissed', count: dismissed.length },
          { key:'all',       label:'All',       count: items.length },
        ]}
        active={filter} onChange={setFilter}
      />
      {(() => {
        const show = filter==='active' ? active : filter==='dismissed' ? dismissed : filter==='all' ? items : bySev(filter)
        if (!show.length) return <Empty title="No signals" sub="Signals are generated automatically from meetings and Slack"/>
        return (
          <div className="space-y-3">
            {show.map(s => <SignalCard key={s.id} s={s} onDismiss={onDismiss}/>)}
          </div>
        )
      })()}
    </div>
  )
}

/* ─── ASKS TAB ──────────────────────────────────────────────────── */
const DIRECTION_META = {
  zamp_owes_client:    { label:'We Owe',      color:'red',    desc:'Zamp owes client' },
  client_owes_zamp:    { label:'They Owe',    color:'blue',   desc:'Client owes Zamp' },
  mutual:              { label:'Mutual',      color:'purple', desc:'Both sides' },
  internal:            { label:'Internal',   color:'gray',   desc:'Internal only' },
}

function AskCard({ a, onUpdate }) {
  const [expanded, setExpanded] = useState(false)
  const dir = DIRECTION_META[a.direction] || {}
  const sources = Array.isArray(a.sources) ? a.sources : (a.sources ? [a.sources] : [])

  return (
    <div className={`bg-white border rounded-xl overflow-hidden ${a.status==='open' && a.direction==='zamp_owes_client' ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {dir.label && <Chip color={dir.color}>{dir.label}</Chip>}
              {a.category && <Chip color="gray">{a.category}</Chip>}
              <StatusBadge status={a.status}/>
              <ConfidenceBar value={a.confidence}/>
            </div>
            <p className="text-[14px] font-semibold text-gray-800 leading-snug">{a.ask_text}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {a.owner_name && (
                <span className="flex items-center gap-1 text-[12px] text-gray-500">
                  <User size={11}/> Owner: <span className="font-medium text-gray-700 ml-0.5">{a.owner_name}</span>
                </span>
              )}
              {a.raised_by_name && a.raised_by_name !== a.owner_name && (
                <span className="flex items-center gap-1 text-[12px] text-gray-400">
                  <ArrowRight size={11}/> Raised by {a.raised_by_name}
                </span>
              )}
              {a.eta && (
                <span className={`flex items-center gap-1 text-[12px] ${daysFrom(a.eta)<0?'text-red-500 font-semibold':'text-gray-500'}`}>
                  <Clock size={11}/> ETA: {fmtDate(a.eta)}
                  {daysFrom(a.eta) !== null && daysFrom(a.eta) < 0 && <span className="text-red-500">(overdue)</span>}
                </span>
              )}
            </div>
            {a.notes && <p className="text-[12px] text-gray-400 mt-1.5 italic">{a.notes}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {sources.length > 0 && (
              <button onClick={()=>setExpanded(!expanded)}
                className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50">
                <CornerDownRight size={11}/>{sources.length}
                <ChevronDown size={11} className={`transition-transform ${expanded?'rotate-180':''}`}/>
              </button>
            )}
            {a.status === 'open' && (
              <button onClick={() => onUpdate({ id: a.id, status: 'resolved' })}
                className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50">
                Resolve
              </button>
            )}
          </div>
        </div>
        {expanded && <SourceEvidence sources={sources}/>}
      </div>
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <span className="text-[11px] text-gray-400">{fmtRel(a.created_at)}</span>
      </div>
    </div>
  )
}

function AsksTab({ clientId }) {
  const { data: asks, isLoading, error } = useAsks({ client_id: clientId })
  const updateAsk = useUpdateAsk()
  const [filter, setFilter] = useState('open')

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>
  if (error) return <ErrorMessage message={error.message} />

  const items = (asks||[])
  const open   = items.filter(a=>a.status==='open')
  const weOwe  = open.filter(a=>a.direction==='zamp_owes_client')
  const theyOwe= open.filter(a=>a.direction==='client_owes_zamp')
  const done   = items.filter(a=>['resolved','dismissed'].includes(a.status))

  const onUpdate = (payload) => updateAsk.mutate(payload)

  return (
    <div className="p-6">
      <FilterBar
        opts={[
          { key:'open',      label:'Open',      count: open.length },
          { key:'we_owe',    label:'We Owe',    count: weOwe.length },
          { key:'they_owe',  label:'They Owe',  count: theyOwe.length },
          { key:'resolved',  label:'Resolved',  count: done.length },
          { key:'all',       label:'All',       count: items.length },
        ]}
        active={filter} onChange={setFilter}
      />
      {(() => {
        const show = filter==='open'?open:filter==='we_owe'?weOwe:filter==='they_owe'?theyOwe:filter==='resolved'?done:items
        if (!show.length) return <Empty title="No asks" sub="Open asks from client or Zamp will appear here"/>
        return (
          <div className="space-y-3">
            {show.map(a=><AskCard key={a.id} a={a} onUpdate={onUpdate}/>)}
          </div>
        )
      })()}
    </div>
  )
}

/* ─── COMMITMENTS TAB ───────────────────────────────────────────── */
function CommitmentsTab({ clientId }) {
  const { data: commitments, isLoading, error } = useCommitments({ client_id: clientId })
  const updateCommitment = useUpdateCommitment()
  const [filter, setFilter] = useState('open')

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>
  if (error) return <ErrorMessage message={error.message} />

  const items = (commitments||[])
  const open   = items.filter(c=>!['fulfilled','cancelled'].includes(c.status))
  const done   = items.filter(c=>c.status==='fulfilled')
  const overdue= open.filter(c=>c.due_date && daysFrom(c.due_date)<0)

  const onFulfill = (id) => updateCommitment.mutate({ id, status:'fulfilled', fulfilled_at: new Date().toISOString() })

  return (
    <div className="p-6">
      <FilterBar
        opts={[
          { key:'open',    label:'Open',       count: open.length },
          { key:'overdue', label:'Overdue',    count: overdue.length },
          { key:'done',    label:'Fulfilled',  count: done.length },
          { key:'all',     label:'All',        count: items.length },
        ]}
        active={filter} onChange={setFilter}
      />
      {(() => {
        const show = filter==='open'?open:filter==='overdue'?overdue:filter==='done'?done:items
        if (!show.length) return <Empty title="No commitments" sub="Commitments made in meetings will appear here"/>
        return (
          <div className="space-y-3">
            {show.map(c => {
              const sources = Array.isArray(c.sources) ? c.sources : (c.sources ? [c.sources] : [])
              const [expanded, setExpanded] = useState(false)
              const isDone = c.status==='fulfilled'
              const isOverdue = !isDone && c.due_date && daysFrom(c.due_date)<0
              return (
                <div key={c.id} className={`bg-white border rounded-xl overflow-hidden ${isOverdue?'border-red-200':isDone?'border-emerald-100':'border-gray-200'}`}>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${isDone?'bg-emerald-500 border-emerald-500':isOverdue?'border-red-300':'border-gray-300'}`}>
                        {isDone && <CheckCheck size={11} className="text-white"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {c.source_type && <Chip color="gray">{c.source_type.replace(/_/g,' ')}</Chip>}
                          <StatusBadge status={c.status}/>
                          <ConfidenceBar value={c.confidence}/>
                        </div>
                        <p className={`text-[14px] font-semibold leading-snug ${isDone?'text-gray-400 line-through':'text-gray-800'}`}>
                          {c.commitment_text}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          {c.due_date && (
                            <span className={`flex items-center gap-1 text-[12px] ${isOverdue?'text-red-500 font-semibold':'text-gray-400'}`}>
                              <Calendar size={11}/> Due {fmtDate(c.due_date)}
                            </span>
                          )}
                          {c.fulfilled_at && (
                            <span className="flex items-center gap-1 text-[12px] text-emerald-600">
                              <CheckCircle2 size={11}/> Fulfilled {fmtDate(c.fulfilled_at)}
                            </span>
                          )}
                          {c.made_by_id && (
                            <span className="text-[12px] text-gray-400 flex items-center gap-1">
                              <User size={11}/> ID {c.made_by_id}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {sources.length > 0 && (
                          <button onClick={()=>setExpanded(!expanded)}
                            className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50">
                            <CornerDownRight size={11}/>{sources.length}
                            <ChevronDown size={11} className={`transition-transform ${expanded?'rotate-180':''}`}/>
                          </button>
                        )}
                        {!isDone && (
                          <button onClick={()=>onFulfill(c.id)}
                            className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50">
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                    {expanded && <SourceEvidence sources={sources}/>}
                  </div>
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                    <span className="text-[11px] text-gray-400">{fmtRel(c.created_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

/* ─── MEETINGS TAB ──────────────────────────────────────────────── */
function renderSummaryLine(line, i) {
  // Bold heading: **text**: rest  or  **text**
  const boldHeading = line.match(/^\*\*(.+?)\*\*:?\s*(.*)$/)
  if (boldHeading) {
    return (
      <p key={i} className="text-[13px] text-gray-800 leading-relaxed">
        <span className="font-semibold">{boldHeading[1]}{boldHeading[2]?': ':''}</span>
        {boldHeading[2] && <span className="text-gray-600">{boldHeading[2]}</span>}
      </p>
    )
  }
  return <p key={i} className="text-[13px] text-gray-600 leading-relaxed">{line}</p>
}

function TranscriptView({ transcript }) {
  // Render speaker-turn transcript: "Speaker Name: text\nSpeaker: text..."
  const lines = transcript.split('\n').filter(Boolean)
  const turns = []
  let current = null
  for (const line of lines) {
    const match = line.match(/^([^:]{2,40}):\s+(.+)$/)
    if (match) {
      if (current) turns.push(current)
      current = { speaker: match[1], text: match[2] }
    } else if (current) {
      current.text += ' ' + line
    } else {
      turns.push({ speaker: null, text: line })
    }
  }
  if (current) turns.push(current)

  // Collapse consecutive turns by same speaker
  const collapsed = []
  for (const t of turns) {
    const last = collapsed[collapsed.length - 1]
    if (last && last.speaker === t.speaker) {
      last.text += ' ' + t.text
    } else {
      collapsed.push({ ...t })
    }
  }

  if (!collapsed.length) return <p className="text-[13px] text-gray-500 italic">No transcript content.</p>

  return (
    <div className="space-y-3">
      {collapsed.map((t, i) => (
        <div key={i} className="flex gap-3">
          {t.speaker && (
            <div className="flex-shrink-0 pt-0.5">
              <div className="w-6 h-6 rounded-full bg-zamp-100 text-zamp-700 text-[10px] font-bold flex items-center justify-center">
                {t.speaker.trim().split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
            </div>
          )}
          <div className="flex-1 min-w-0">
            {t.speaker && <p className="text-[11px] font-semibold text-gray-500 mb-0.5">{t.speaker}</p>}
            <p className="text-[13px] text-gray-700 leading-relaxed">{t.text}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function MeetingCard({ m }) {
  const [expanded, setExpanded]   = useState(false)
  const [activeView, setActiveView] = useState('notes') // 'notes' | 'transcript'

  // Only fetch detail when expanded
  const { data: detail, isLoading: detailLoading } = useMeeting(expanded ? m.id : null)

  const attendees   = Array.isArray(m.attendees) ? m.attendees : []
  const keyTopics   = Array.isArray(m.key_topics) ? m.key_topics : []

  // Use detail data when available, fall back to list data
  const summary     = detail?.summary    || m.summary    || ''
  const actionItems = Array.isArray(detail?.action_items || m.action_items)
    ? (detail?.action_items || m.action_items) : []
  const transcript  = detail?.full_transcript || ''
  const hasTranscript = !!(detail?.transcript_ready && transcript)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* header row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {m.follow_up_pending && <Chip color="amber"><AlertCircle size={10}/>Follow-up needed</Chip>}
              {m.transcript_ready  && <Chip color="teal"><FileText size={10}/>Transcript</Chip>}
              {m.recording_url && (
                <a href={m.recording_url} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-zamp-500 hover:text-zamp-700 font-medium">
                  <ExternalLink size={10}/>Recording
                </a>
              )}
            </div>
            <h3 className="text-[14px] font-semibold text-gray-800 leading-snug">{m.title}</h3>
            <div className="flex flex-wrap items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-[12px] text-gray-400">
                <Calendar size={11}/>{fmtDate(m.meeting_date)}
              </span>
              {m.duration_minutes && <span className="text-[12px] text-gray-400">{m.duration_minutes} min</span>}
              {attendees.length > 0 && (
                <span className="flex items-center gap-1 text-[12px] text-gray-400">
                  <Users size={11}/>{attendees.join(', ')}
                </span>
              )}
            </div>
            {keyTopics.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keyTopics.map((t,i) => <Chip key={i} color="blue"><Hash size={9}/>{t}</Chip>)}
              </div>
            )}
          </div>
          <button onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[12px] text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2 px-2 py-1 rounded hover:bg-gray-50">
            {expanded ? 'Collapse' : 'Expand'}
            <ChevronDown size={13} className={`transition-transform ${expanded ? 'rotate-180' : ''}`}/>
          </button>
        </div>
      </div>

      {/* expanded body */}
      {expanded && (
        <div className="border-t border-gray-100">
          {detailLoading ? (
            <div className="p-6 flex justify-center"><Spinner /></div>
          ) : (
            <>
              {/* view toggle — only show transcript tab if transcript is available */}
              <div className="flex items-center gap-0 px-4 pt-3 border-b border-gray-100">
                {[
                  { key:'notes',      label:'Notes' },
                  { key:'actions',    label:`Action Items${actionItems.length ? ` (${actionItems.length})` : ''}` },
                  ...(hasTranscript ? [{ key:'transcript', label:'Full Transcript' }] : []),
                ].map(v => (
                  <button key={v.key} onClick={() => setActiveView(v.key)}
                    className={`px-3 py-2 text-[12px] font-medium border-b-2 -mb-px transition-all ${
                      activeView === v.key
                        ? 'text-zamp-600 border-zamp-500'
                        : 'text-gray-400 border-transparent hover:text-gray-600'
                    }`}>
                    {v.label}
                  </button>
                ))}
              </div>

              {/* notes */}
              {activeView === 'notes' && (
                <div className="p-4">
                  {summary ? (
                    <div className="space-y-1.5">
                      {summary.split('\n').filter(Boolean).map((line, i) => renderSummaryLine(line, i))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-gray-400 italic">No notes available.</p>
                  )}
                </div>
              )}

              {/* action items */}
              {activeView === 'actions' && (
                <div className="p-4">
                  {actionItems.length > 0 ? (
                    <ul className="space-y-2">
                      {actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[13px] text-gray-700">
                          <div className="w-4 h-4 rounded border border-gray-300 flex-shrink-0 mt-0.5"/>
                          <span className="leading-relaxed">
                            {typeof item === 'string' ? item.replace(/\*\*/g,'') : JSON.stringify(item)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[13px] text-gray-400 italic">No action items recorded.</p>
                  )}
                </div>
              )}

              {/* transcript */}
              {activeView === 'transcript' && hasTranscript && (
                <div className="p-4 max-h-[500px] overflow-y-auto">
                  <TranscriptView transcript={transcript} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MeetingsTab({ clientId }) {
  const { data: meetings, isLoading, error } = useMeetings(clientId)
  const [filter, setFilter] = useState('all')

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>
  if (error) return <ErrorMessage message={error.message} />

  const items = (meetings||[]).sort((a,b)=>new Date(b.meeting_date)-new Date(a.meeting_date))
  const withFollowUp = items.filter(m=>m.follow_up_pending)
  const last30 = items.filter(m=>daysFrom(m.meeting_date)>=-30)

  return (
    <div className="p-6">
      <FilterBar
        opts={[
          { key:'all',        label:'All',           count: items.length },
          { key:'last30',     label:'Last 30 days',  count: last30.length },
          { key:'follow_up',  label:'Follow-up due', count: withFollowUp.length },
        ]}
        active={filter} onChange={setFilter}
      />
      {(() => {
        const show = filter==='last30'?last30:filter==='follow_up'?withFollowUp:items
        if (!show.length) return <Empty title="No meetings" sub="Meetings synced from Avoma will appear here"/>
        return (
          <div className="space-y-3">
            {show.map(m=><MeetingCard key={m.id} m={m}/>)}
          </div>
        )
      })()}
    </div>
  )
}

/* ─── STAKEHOLDERS TAB ──────────────────────────────────────────── */
const STRENGTH_META = {
  strong:      { color:'green',  label:'Strong' },
  good:        { color:'teal',   label:'Good' },
  developing:  { color:'amber',  label:'Developing' },
  new:         { color:'blue',   label:'New' },
  weak:        { color:'red',    label:'Weak' },
  champion:    { color:'purple', label:'Champion' },
}

function StakeholdersTab({ clientId }) {
  const { data: stakeholders, isLoading, error } = useStakeholders(clientId)
  const [filter, setFilter] = useState('all')

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>
  if (error) return <ErrorMessage message={error.message} />

  const items = (stakeholders||[])
  const champions = items.filter(s=>s.relationship_strength==='champion'||s.is_champion)
  const primary   = items.filter(s=>s.is_primary)

  return (
    <div className="p-6">
      <FilterBar
        opts={[
          { key:'all',      label:'All',       count: items.length },
          { key:'primary',  label:'Primary',   count: primary.length },
          { key:'champion', label:'Champions', count: champions.length },
        ]}
        active={filter} onChange={setFilter}
      />
      {(() => {
        const show = filter==='primary'?primary:filter==='champion'?champions:items
        if (!show.length) return <Empty title="No stakeholders" sub="Add key contacts at this client"/>
        return (
          <div className="grid grid-cols-2 gap-3">
            {show.map(s => {
              const sm = STRENGTH_META[s.relationship_strength] || { color:'gray', label: s.relationship_strength||'Unknown' }
              return (
                <div key={s.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={s.name} size="lg"/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-semibold text-gray-800">{s.name}</p>
                        {s.is_primary && <Star size={12} className="text-amber-400 fill-amber-400"/>}
                        {s.is_champion && <Chip color="purple"><Sparkles size={9}/>Champion</Chip>}
                      </div>
                      {s.title && <p className="text-[12px] text-gray-500 mt-0.5">{s.title}</p>}
                      {s.department && <p className="text-[11px] text-gray-400">{s.department}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Chip color={sm.color}>{sm.label}</Chip>
                        {s.influence_level && <Chip color="gray">Influence: {s.influence_level}</Chip>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {s.email && (
                          <a href={`mailto:${s.email}`} className="flex items-center gap-1 text-[12px] text-zamp-500 hover:text-zamp-700">
                            <Mail size={11}/>{s.email}
                          </a>
                        )}
                        {s.linkedin_url && (
                          <a href={s.linkedin_url} target="_blank" rel="noreferrer" className="text-[11px] text-gray-400 hover:text-gray-600">
                            LinkedIn →
                          </a>
                        )}
                      </div>
                      {s.last_met && (
                        <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                          <Calendar size={10}/> Last met {fmtRel(s.last_met)}
                        </p>
                      )}
                      {s.notes && <p className="text-[12px] text-gray-500 mt-1.5 italic">{s.notes}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}

/* ─── MAIN PAGE ─────────────────────────────────────────────────── */
export default function ClientDetail() {
  const { id: clientId } = useParams()
  const [tab, setTab] = useState('overview')

  const { data: client, isLoading, error } = useClient(clientId)

  // prefetch counts for tab badges
  const { data: milestones } = useMilestones(clientId)
  const { data: tasks }      = useTasks({ client_id: clientId })
  const { data: asks }       = useAsks({ client_id: clientId })
  const { data: meetings }   = useMeetings(clientId)
  const { data: commitments }= useCommitments({ client_id: clientId })
  const { data: signals }    = useSignals({ client_id: clientId })
  const { data: stakeholders }= useStakeholders(clientId)

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner />
    </div>
  )
  if (error) return (
    <div className="p-8">
      <ErrorMessage message={`Could not load client: ${error.message}`} />
      <Link to="/clients" className="mt-4 inline-flex items-center gap-1 text-sm text-zamp-500 hover:text-zamp-700">
        <ArrowLeft size={14}/> Back to clients
      </Link>
    </div>
  )
  if (!client) return (
    <div className="p-8 text-gray-400 text-sm">Client not found.</div>
  )

  const openSignals = (signals||[]).filter(s=>s.status!=='dismissed')

  const TABS = [
    { key:'overview',     label:'Overview',     icon: CircleDot,      count:0 },
    { key:'milestones',   label:'Milestones',   icon: Target,         count: (milestones||[]).filter(m=>!m.completed_at).length },
    { key:'tasks',        label:'Tasks',        icon: CheckCircle2,   count: (tasks||[]).filter(t=>!['done','completed','cancelled'].includes(t.status)).length },
    { key:'asks',         label:'Asks',         icon: MessageSquare,  count: (asks||[]).filter(a=>a.status==='open').length },
    { key:'commitments',  label:'Commitments',  icon: CheckCheck,     count: (commitments||[]).filter(c=>!['fulfilled','cancelled'].includes(c.status)).length },
    { key:'signals',      label:'Signals',      icon: Zap,            count: openSignals.length },
    { key:'meetings',     label:'Meetings',     icon: Calendar,       count: (meetings||[]).length },
    { key:'stakeholders', label:'Stakeholders', icon: Users,          count: (stakeholders||[]).length },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <ClientHeader client={client} />
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="max-w-5xl mx-auto">
        {tab === 'overview'     && <OverviewTab client={client} milestones={milestones} signals={signals} tasks={tasks} asks={asks}/>}
        {tab === 'milestones'   && <MilestonesTab   clientId={clientId}/>}
        {tab === 'tasks'        && <TasksTab         clientId={clientId}/>}
        {tab === 'asks'         && <AsksTab          clientId={clientId}/>}
        {tab === 'commitments'  && <CommitmentsTab   clientId={clientId}/>}
        {tab === 'signals'      && <SignalsTab        clientId={clientId}/>}
        {tab === 'meetings'     && <MeetingsTab       clientId={clientId}/>}
        {tab === 'stakeholders' && <StakeholdersTab   clientId={clientId}/>}
      </div>
    </div>
  )
}
