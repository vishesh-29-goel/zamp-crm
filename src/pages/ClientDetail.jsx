import { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, Calendar, CheckCircle2, Clock, AlertTriangle, ChevronDown,
  Users, Target, MessageSquare, TrendingUp, Zap, CheckCheck, AlertCircle, FileText, Flag, Sparkles, Mail, Phone, Globe,
  Building2, User, Star, ArrowRight, CornerDownRight, ExternalLink,
  ChevronRight, Circle, Hash, Tag, Layers, Plus, X, Send, Reply,
  Smile, Trash2, ChevronLeft, Pencil
} from 'lucide-react'
import {
  useClient, useMilestones, useTasks, useAsks, useMeetings, useMeeting,
  useCommitments, useSignals, useStakeholders,
  useUpdateTask, useUpdateAsk, useUpdateCommitment, useUpdateSignal,
  useProcesses, useProcess, useAddUpdate, useAddActionItem, useToggleActionItem,
  useAddBlocker, useResolveBlocker, useComments, useAddComment, useDeleteComment,
  useAddReaction, useRemoveReaction, useZampians,
  useCreateProcess, useUpdateProcess, useDeleteProcess
} from '../lib/useApi'
import { useAuth } from '../lib/auth'
import {
  updateUpdate, deleteUpdate,
  updateActionItem, deleteActionItem,
  updateBlocker, deleteBlocker,
} from '../lib/api'
import HealthBadge from '../components/HealthBadge'
import StageBadge from '../components/StageBadge'
import Spinner from '../components/Spinner'
import ErrorMessage from '../components/ErrorMessage'
import TaskDetailPanel from '../components/TaskDetailPanel'
import ZampianCombobox from '../components/ZampianCombobox'

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
    at_risk:'bg-red-50 text-red-600', fulfilled:'bg-emerald-50 text-emerald-700'}
  const label = {
    open:'Open', in_progress:'In Progress', done:'Done', completed:'Completed',
    cancelled:'Cancelled', pending:'Pending', resolved:'Resolved',
    dismissed:'Dismissed', at_risk:'At Risk', fulfilled:'Fulfilled'}
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
    teal:'bg-teal-50 text-teal-700', orange:'bg-orange-50 text-orange-700'}
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
  low:      'bg-gray-100 text-gray-500'}

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
    all:     items}

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
  low:      { dot:'bg-gray-300',   chip:'gray',   label:'Low' }}

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
  internal:            { label:'Internal',   color:'gray',   desc:'Internal only' }}

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
  champion:    { color:'purple', label:'Champion' }}

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

/* ─── COMMENTS THREAD ──────────────────────────────────────────── */
const EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢']

// Parse @mention tokens in text and render styled spans
function CommentText({ text }) {
  if (!text) return null
  const parts = text.split(/(@\w[\w\s]*?\b)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-zamp-600 font-semibold bg-zamp-50 rounded px-1">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// @-mention autocomplete composer
function CommentComposer({ processId, parentId = null, onCancel, autoFocus = false }) {
  const [text, setText]         = useState('')
  const [mentionQuery, setMentionQuery] = useState(null) // null = closed, string = query
  const [mentionStart, setMentionStart] = useState(0)
  const textareaRef             = useRef(null)
  const addComment              = useAddComment(processId)
  const { data: zampians = [] } = useZampians()

  useEffect(() => {
    if (autoFocus && textareaRef.current) textareaRef.current.focus()
  }, [autoFocus])

  const handleKeyUp = (e) => {
    const val = e.target.value
    const pos = e.target.selectionStart
    // Find the last @ before cursor
    const before = val.slice(0, pos)
    const atIdx  = before.lastIndexOf('@')
    if (atIdx !== -1 && !before.slice(atIdx + 1).includes(' ')) {
      setMentionQuery(before.slice(atIdx + 1))
      setMentionStart(atIdx)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (name) => {
    const before = text.slice(0, mentionStart)
    const after  = text.slice(textareaRef.current.selectionStart)
    setText(`${before}@${name} ${after}`)
    setMentionQuery(null)
    textareaRef.current.focus()
  }

  const filteredZampians = mentionQuery !== null
    ? zampians.filter(z => z.name && z.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 6)
    : []

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    addComment.mutate(
      { text: text.trim(), parent_id: parentId ?? null },
      { onSuccess: () => { setText(''); if (onCancel) onCancel() } }
    )
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyUp={handleKeyUp}
          placeholder={parentId ? 'Write a reply…' : 'Add a comment… (type @ to mention)'}
          rows={2}
          className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-zamp-400/40 focus:border-zamp-400 placeholder:text-gray-300"
        />
        <div className="flex flex-col gap-1">
          <button
            type="submit"
            disabled={!text.trim() || addComment.isPending}
            className="p-2 rounded-lg bg-zamp-600 text-white hover:bg-zamp-700 disabled:opacity-40 transition-colors"
          >
            <Send size={13} />
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel}
              className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={13} />
            </button>
          )}
        </div>
      </form>
      {mentionQuery !== null && filteredZampians.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[180px]">
          {filteredZampians.map(z => (
            <button
              key={z.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(z.name) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-zamp-50 text-left"
            >
              <div className="w-5 h-5 rounded-full bg-zamp-100 text-zamp-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                {(z.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <span className="font-medium text-gray-700">{z.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CommentNode({ comment, allComments, processId, zampianId, highlightId }) {
  const [replying, setReplying]   = useState(false)
  const nodeRef                   = useRef(null)
  const isHighlighted             = String(comment.id) === String(highlightId)
  const isDeleted                 = !!comment.deleted_at || comment.is_deleted
  const isOwner                   = comment.author_id === zampianId
  const deleteComment             = useDeleteComment(processId)
  const addReaction               = useAddReaction(processId)
  const removeReaction            = useRemoveReaction(processId)
  const replies                   = allComments.filter(c => String(c.parent_id) === String(comment.id))

  // Scroll & highlight on mount if this is the deep-linked comment
  const [highlighted, setHighlighted] = useState(isHighlighted)
  useEffect(() => {
    if (isHighlighted && nodeRef.current) {
      nodeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const timer = setTimeout(() => setHighlighted(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isHighlighted])

  const handleReact = (emoji) => {
    const myReaction = (comment.reactions || []).find(r => r.emoji === emoji && r.zampian_id === zampianId)
    if (myReaction) {
      removeReaction.mutate({ commentId: comment.id, emoji })
    } else {
      addReaction.mutate({ commentId: comment.id, emoji })
    }
  }

  const reactionMap = {}
  for (const r of (comment.reactions || [])) {
    reactionMap[r.emoji] = (reactionMap[r.emoji] || 0) + 1
  }
  const myReactions = new Set((comment.reactions || []).filter(r => r.zampian_id === zampianId).map(r => r.emoji))

  return (
    <div ref={nodeRef}
      className={`transition-all duration-500 rounded-xl p-3 ${highlighted ? 'bg-zamp-50 ring-2 ring-zamp-300' : ''}`}>
      <div className="flex gap-2.5">
        <Avatar name={comment.author_name || '?'} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-semibold text-gray-700">{comment.author_name || 'Unknown'}</span>
            <span className="text-[11px] text-gray-400">{fmtRel(comment.created_at)}</span>
          </div>

          {isDeleted ? (
            <p className="text-[12px] text-gray-400 italic">This comment was deleted.</p>
          ) : (
            <>
              <p className="text-[13px] text-gray-700 leading-relaxed">
                <CommentText text={comment.text} />
              </p>

              {/* Emoji reactions */}
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {EMOJIS.map(emoji => {
                  const count = reactionMap[emoji] || 0
                  const isMine = myReactions.has(emoji)
                  return (
                    <button
                      key={emoji}
                      onClick={() => handleReact(emoji)}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] border transition-all ${
                        isMine
                          ? 'bg-zamp-50 border-zamp-300 text-zamp-700'
                          : count > 0
                            ? 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                            : 'bg-transparent border-transparent text-gray-300 hover:text-gray-500 hover:border-gray-200'
                      }`}
                    >
                      <span>{emoji}</span>
                      {count > 0 && <span className="font-medium">{count}</span>}
                    </button>
                  )
                })}
              </div>

              {/* Actions: Reply + Delete */}
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  onClick={() => setReplying(r => !r)}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-zamp-600 transition-colors"
                >
                  <Reply size={11} />Reply
                </button>
                {isOwner && (
                  <button
                    onClick={() => deleteComment.mutate(comment.id)}
                    className="flex items-center gap-1 text-[11px] text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={11} />Delete
                  </button>
                )}
              </div>

              {replying && (
                <div className="mt-2">
                  <CommentComposer
                    processId={processId}
                    parentId={comment.id}
                    onCancel={() => setReplying(false)}
                    autoFocus
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Replies — indented with left border */}
      {replies.length > 0 && (
        <div className="ml-8 mt-2 space-y-2 pl-3 border-l-2 border-gray-100">
          {replies.map(r => (
            <CommentNode
              key={r.id}
              comment={r}
              allComments={allComments}
              processId={processId}
              zampianId={zampianId}
              highlightId={highlightId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentsThread({ processId }) {
  const { data: comments = [], isLoading } = useComments(processId)
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('commentId')
  const zampianId = user?.zampian?.id

  // Only top-level comments (parent_id === null or undefined)
  const roots = (comments || []).filter(c => !c.parent_id)

  return (
    <div className="mt-6 border-t border-gray-100 pt-5">
      <h3 className="text-[13px] font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
        <MessageSquare size={14} />
        Comments {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
      </h3>

      {isLoading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : (
        <div className="space-y-3">
          {roots.map(c => (
            <CommentNode
              key={c.id}
              comment={c}
              allComments={comments}
              processId={processId}
              zampianId={zampianId}
              highlightId={highlightId}
            />
          ))}
          {roots.length === 0 && (
            <p className="text-[12px] text-gray-400 italic py-2">No comments yet. Be the first to comment.</p>
          )}
        </div>
      )}

      <div className="mt-4">
        <CommentComposer processId={processId} />
      </div>
    </div>
  )
}

/* ─── PROCESS DETAIL VIEW ───────────────────────────────────────── */
function ProcessDetail({ clientId, processId, onBack, canEdit }) {
  const { data: raw, isLoading, error } = useProcess(clientId, processId)
  const addUpdate       = useAddUpdate(clientId, processId)
  const addActionItem   = useAddActionItem(clientId, processId)
  const toggleActionItem= useToggleActionItem(clientId, processId)
  const addBlocker      = useAddBlocker(clientId, processId)
  const resolveBlocker  = useResolveBlocker(clientId, processId)
  const qc              = useQueryClient()

  const [newUpdate, setNewUpdate]           = useState('')
  const [newActionText, setNewActionText]   = useState('')
  const [newActionDue, setNewActionDue]     = useState('')
  const [newBlocker, setNewBlocker]         = useState('')
  const [showAddUpdate, setShowAddUpdate]   = useState(false)
  const [showAddAction, setShowAddAction]   = useState(false)
  const [showAddBlocker, setShowAddBlocker] = useState(false)

  // Issue 3: inline edit/delete state
  const [editingUpdateId,     setEditingUpdateId]     = useState(null)
  const [editingActionItemId, setEditingActionItemId] = useState(null)
  const [editingBlockerId,    setEditingBlockerId]    = useState(null)
  const [editUpdateContent,   setEditUpdateContent]   = useState('')
  const [editActionDesc,      setEditActionDesc]      = useState('')
  const [editActionDue,       setEditActionDue]       = useState('')
  const [editBlockerContent,  setEditBlockerContent]  = useState('')

  const qKey = ['process', clientId, processId]
  const { mutate: mutateUpdateUpdate } = useMutation({
    mutationFn: ({ updateId, data }) => updateUpdate(clientId, processId, updateId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); setEditingUpdateId(null) },
  })
  const { mutate: mutateDeleteUpdate } = useMutation({
    mutationFn: (updateId) => deleteUpdate(clientId, processId, updateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  })
  const { mutate: mutateUpdateActionItem } = useMutation({
    mutationFn: ({ actionItemId, data }) => updateActionItem(clientId, processId, actionItemId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); setEditingActionItemId(null) },
  })
  const { mutate: mutateDeleteActionItem } = useMutation({
    mutationFn: (actionItemId) => deleteActionItem(clientId, processId, actionItemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  })
  const { mutate: mutateUpdateBlocker } = useMutation({
    mutationFn: ({ blockerId, data }) => updateBlocker(clientId, processId, blockerId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qKey }); setEditingBlockerId(null) },
  })
  const { mutate: mutateDeleteBlocker } = useMutation({
    mutationFn: (blockerId) => deleteBlocker(clientId, processId, blockerId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qKey }),
  })

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>
  if (error) return <div className="p-6"><ErrorMessage message={error} /></div>
  if (!raw) return null

  // Backend returns { process, updates, action_items, blockers }
  const proc        = raw.process      || raw
  const updates     = raw.updates      || proc.updates     || []
  const actionItems = raw.action_items || proc.action_items || []
  const blockers    = raw.blockers     || proc.blockers     || []
  const activeBlockers   = blockers.filter(b => !b.resolved)
  const resolvedBlockers = blockers.filter(b =>  b.resolved)

  const handleAddUpdate = (e) => {
    e.preventDefault()
    if (!newUpdate.trim()) return
    // Backend expects { content }
    addUpdate.mutate({ content: newUpdate.trim() }, { onSuccess: () => { setNewUpdate(''); setShowAddUpdate(false) } })
  }
  const handleAddAction = (e) => {
    e.preventDefault()
    if (!newActionText.trim()) return
    // Backend expects { description, due_date? }
    addActionItem.mutate(
      { description: newActionText.trim(), due_date: newActionDue || undefined },
      { onSuccess: () => { setNewActionText(''); setNewActionDue(''); setShowAddAction(false) } }
    )
  }
  const handleAddBlocker = (e) => {
    e.preventDefault()
    if (!newBlocker.trim()) return
    // Backend expects { content }
    addBlocker.mutate({ content: newBlocker.trim() }, { onSuccess: () => { setNewBlocker(''); setShowAddBlocker(false) } })
  }

  const isDoneAI = (a) => a.status === 'done' || a.done

  return (
    <div className="p-6 max-w-3xl">
      {/* Back button */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-zamp-600 mb-4 transition-colors">
        <ChevronLeft size={14} />Back to Processes
      </button>

      <h2 className="text-[18px] font-bold text-gray-900 mb-1">{proc.name || proc.process_name}</h2>
      {proc.poc_name && proc.poc_name !== 'Unassigned' && (
        <p className="text-[12px] text-gray-500 mb-5 flex items-center gap-1"><User size={11}/>POC: {proc.poc_name}</p>
      )}

      {/* ── Updates ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-gray-700 uppercase tracking-wider">
            Updates {updates.length > 0 && <span className="text-gray-400 font-normal text-[12px]">({updates.length})</span>}
          </h3>
          {canEdit && (
            <button onClick={() => setShowAddUpdate(v => !v)}
              className="flex items-center gap-1 text-[11px] text-zamp-600 hover:text-zamp-800 transition-colors">
              <Plus size={12} />Post update
            </button>
          )}
        </div>
        {canEdit && showAddUpdate && (
          <form onSubmit={handleAddUpdate} className="mb-3 space-y-2">
            <textarea
              autoFocus
              rows={3}
              value={newUpdate}
              onChange={e => setNewUpdate(e.target.value)}
              placeholder="What's the latest update on this process?"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-400/40 focus:border-zamp-400 resize-none placeholder:text-gray-300"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={!newUpdate.trim() || addUpdate.isPending}
                className="px-3 py-1.5 text-[12px] bg-zamp-600 text-white rounded-lg hover:bg-zamp-700 disabled:opacity-50 transition-colors">
                Post update
              </button>
              <button type="button" onClick={() => { setShowAddUpdate(false); setNewUpdate('') }}
                className="px-3 py-1.5 text-[12px] border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
        {updates.length === 0 && !showAddUpdate
          ? <p className="text-[12px] text-gray-400 italic">No updates yet.</p>
          : updates.map(u => (
            <div key={u.id} className="flex gap-2.5 py-2.5 border-b border-gray-50 last:border-0 group">
              <Avatar name={u.author_name || '?'} size="sm" />
              <div className="flex-1 min-w-0">
                {editingUpdateId === u.id ? (
                  <form onSubmit={e => { e.preventDefault(); mutateUpdateUpdate({ updateId: u.id, data: { content: editUpdateContent } }) }} className="space-y-1">
                    <textarea rows={2} autoFocus value={editUpdateContent} onChange={e => setEditUpdateContent(e.target.value)}
                      className="w-full px-2 py-1 text-[13px] border border-zamp-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-400/40 resize-none" />
                    <div className="flex gap-1.5">
                      <button type="submit" className="px-2 py-1 text-[11px] bg-zamp-600 text-white rounded-md hover:bg-zamp-700">Save</button>
                      <button type="button" onClick={() => setEditingUpdateId(null)} className="px-2 py-1 text-[11px] border border-gray-200 text-gray-500 rounded-md hover:bg-gray-50">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-[13px] text-gray-700 leading-relaxed">{u.content || u.text}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{fmtRel(u.created_at)}{u.author_name && ` · ${u.author_name}`}</p>
                  </>
                )}
              </div>
              {canEdit && editingUpdateId !== u.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => { setEditingUpdateId(u.id); setEditUpdateContent(u.content || u.text || '') }}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-zamp-600 hover:bg-gray-100 transition-colors">
                    <Pencil size={10} />
                  </button>
                  <button onClick={() => mutateDeleteUpdate(u.id)}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          ))
        }
      </section>

      {/* ── Action Items ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-gray-700 uppercase tracking-wider">
            Action Items {actionItems.length > 0 && <span className="text-gray-400 font-normal text-[12px]">({actionItems.length})</span>}
          </h3>
          {canEdit && (
            <button onClick={() => setShowAddAction(v => !v)}
              className="flex items-center gap-1 text-[11px] text-zamp-600 hover:text-zamp-800 transition-colors">
              <Plus size={12} />Add action item
            </button>
          )}
        </div>
        {canEdit && showAddAction && (
          <form onSubmit={handleAddAction} className="mb-3 space-y-2">
            <input
              autoFocus
              value={newActionText}
              onChange={e => setNewActionText(e.target.value)}
              placeholder="Describe the action item…"
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-400/40 focus:border-zamp-400 placeholder:text-gray-300"
            />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={newActionDue}
                onChange={e => setNewActionDue(e.target.value)}
                className="px-3 py-1.5 text-[12px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-400/40 focus:border-zamp-400 text-gray-600"
              />
              <button type="submit" disabled={!newActionText.trim() || addActionItem.isPending}
                className="px-3 py-1.5 text-[12px] bg-zamp-600 text-white rounded-lg hover:bg-zamp-700 disabled:opacity-50 transition-colors">
                Add
              </button>
              <button type="button" onClick={() => { setShowAddAction(false); setNewActionText(''); setNewActionDue('') }}
                className="px-3 py-1.5 text-[12px] border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
        {actionItems.length === 0 && !showAddAction
          ? <p className="text-[12px] text-gray-400 italic">No action items.</p>
          : actionItems.map(a => (
            <div key={a.id} className="flex items-start gap-2.5 py-2 border-b border-gray-50 last:border-0 group">
              <button
                onClick={() => canEdit && toggleActionItem.mutate({ id: a.id, currentDone: isDoneAI(a) })}
                disabled={!canEdit}
                className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                  isDoneAI(a) ? 'bg-emerald-500 border-emerald-500' : canEdit ? 'border-gray-300 hover:border-zamp-400' : 'border-gray-200'
                }`}
              >
                {isDoneAI(a) && <CheckCheck size={9} className="text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                {editingActionItemId === a.id ? (
                  <form onSubmit={e => { e.preventDefault(); mutateUpdateActionItem({ actionItemId: a.id, data: { description: editActionDesc, due_date: editActionDue || undefined } }) }} className="space-y-1">
                    <input autoFocus value={editActionDesc} onChange={e => setEditActionDesc(e.target.value)}
                      className="w-full px-2 py-1 text-[13px] border border-zamp-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-400/40" />
                    <div className="flex items-center gap-1.5">
                      <input type="date" value={editActionDue} onChange={e => setEditActionDue(e.target.value)}
                        className="px-2 py-1 text-[12px] border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-zamp-400/40 text-gray-600" />
                      <button type="submit" className="px-2 py-1 text-[11px] bg-zamp-600 text-white rounded-md hover:bg-zamp-700">Save</button>
                      <button type="button" onClick={() => setEditingActionItemId(null)} className="px-2 py-1 text-[11px] border border-gray-200 text-gray-500 rounded-md hover:bg-gray-50">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className={`text-[13px] leading-relaxed ${isDoneAI(a) ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                      {a.description || a.title || a.text}
                    </p>
                    {a.due_date && (
                      <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${a.is_overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                        <Calendar size={10}/>{fmtDate(a.due_date)}{a.is_overdue && ' (overdue)'}
                      </p>
                    )}
                  </>
                )}
              </div>
              {canEdit && editingActionItemId !== a.id && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                  <button onClick={() => { setEditingActionItemId(a.id); setEditActionDesc(a.description || a.title || ''); setEditActionDue(a.due_date ? a.due_date.slice(0,10) : '') }}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-zamp-600 hover:bg-gray-100 transition-colors">
                    <Pencil size={10} />
                  </button>
                  <button onClick={() => mutateDeleteActionItem(a.id)}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          ))
        }
      </section>

      {/* ── Blockers ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[13px] font-semibold text-gray-700 uppercase tracking-wider">
            Blockers {activeBlockers.length > 0 && <span className="text-red-400 font-normal text-[12px]">({activeBlockers.length} active)</span>}
          </h3>
          {canEdit && (
            <button onClick={() => setShowAddBlocker(v => !v)}
              className="flex items-center gap-1 text-[11px] text-zamp-600 hover:text-zamp-800 transition-colors">
              <Plus size={12} />Add blocker
            </button>
          )}
        </div>
        {canEdit && showAddBlocker && (
          <form onSubmit={handleAddBlocker} className="flex gap-2 mb-3">
            <input
              autoFocus
              value={newBlocker}
              onChange={e => setNewBlocker(e.target.value)}
              placeholder="Describe the blocker…"
              className="flex-1 px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-400/40 focus:border-zamp-400 placeholder:text-gray-300"
            />
            <button type="submit" disabled={!newBlocker.trim() || addBlocker.isPending}
              className="px-3 py-1.5 text-[12px] bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors">
              Add blocker
            </button>
            <button type="button" onClick={() => { setShowAddBlocker(false); setNewBlocker('') }}
              className="px-3 py-1.5 text-[12px] border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </form>
        )}
        {activeBlockers.length === 0 && !showAddBlocker
          ? <p className="text-[12px] text-gray-400 italic">No active blockers.</p>
          : activeBlockers.map(b => (
            <div key={b.id} className="flex items-start gap-2.5 py-2.5 border border-red-100 rounded-xl px-3 mb-2 bg-red-50 group">
              <Flag size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {editingBlockerId === b.id ? (
                  <form onSubmit={e => { e.preventDefault(); mutateUpdateBlocker({ blockerId: b.id, data: { content: editBlockerContent } }) }} className="space-y-1">
                    <textarea rows={2} autoFocus value={editBlockerContent} onChange={e => setEditBlockerContent(e.target.value)}
                      className="w-full px-2 py-1 text-[13px] border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400/40 resize-none bg-white" />
                    <div className="flex gap-1.5">
                      <button type="submit" className="px-2 py-1 text-[11px] bg-zamp-600 text-white rounded-md hover:bg-zamp-700">Save</button>
                      <button type="button" onClick={() => setEditingBlockerId(null)} className="px-2 py-1 text-[11px] border border-gray-200 text-gray-500 rounded-md hover:bg-gray-50">Cancel</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p className="text-[13px] text-gray-800">{b.content || b.description || b.text}</p>
                    {b.created_at && <p className="text-[11px] text-gray-400 mt-0.5">{fmtRel(b.created_at)}{b.author_name && ` · ${b.author_name}`}</p>}
                  </>
                )}
              </div>
              {canEdit && editingBlockerId !== b.id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => resolveBlocker.mutate(b.id)}
                    disabled={resolveBlocker.isPending}
                    className="text-[11px] font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                  >
                    Resolve
                  </button>
                  <button onClick={() => { setEditingBlockerId(b.id); setEditBlockerContent(b.content || b.description || '') }}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-zamp-600 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100">
                    <Pencil size={10} />
                  </button>
                  <button onClick={() => mutateDeleteBlocker(b.id)}
                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-100 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
          ))
        }
        {resolvedBlockers.length > 0 && (
          <p className="text-[11px] text-gray-400 mt-1">{resolvedBlockers.length} resolved blocker{resolvedBlockers.length !== 1 ? 's' : ''}</p>
        )}
      </section>

      {/* ── Comments Thread ── */}
      <CommentsThread processId={processId} />
    </div>
  )
}

/* ─── PROCESS FORM MODAL ─────────────────────────────────────────── */
function ProcessFormModal({ clientId, process = null, onClose }) {
  const [name, setName]             = useState(process?.name || process?.process_name || '')
  const [pocZampian, setPocZampian] = useState(null)
  const createProcess = useCreateProcess(clientId)
  const updateProcess = useUpdateProcess(clientId)

  // Pre-populate poc from existing process
  const { data: allZampians = [] } = useZampians()
  useEffect(() => {
    if (process?.poc_id && allZampians.length) {
      setPocZampian(allZampians.find(z => z.id === process.poc_id) || null)
    }
  }, [process?.poc_id, allZampians])

  const isPending = createProcess.isPending || updateProcess.isPending

  function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const body = { name: name.trim(), poc_id: pocZampian?.id || null }
    if (process) {
      updateProcess.mutate({ processId: process.id, ...body }, { onSuccess: onClose })
    } else {
      createProcess.mutate(body, { onSuccess: onClose })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
            <Layers size={15} className="text-zamp-600" />
            {process ? 'Edit Process' : 'New Process'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Process Name <span className="text-red-400">*</span></label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Invoice Processing, Vendor Onboarding…"
              required
              className="w-full px-3 py-2 text-[13px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-400/40 focus:border-zamp-400 placeholder:text-gray-300"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">
              POC <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <ZampianCombobox
              value={pocZampian?.id || null}
              onChange={setPocZampian}
              placeholder="Search zampian name or email…"
            />
            {pocZampian && (
              <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                <User size={10} /> {pocZampian.name}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!name.trim() || isPending}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium bg-zamp-600 text-white hover:bg-zamp-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {isPending
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : null}
              {process ? 'Save Changes' : 'Create Process'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── PROCESSES TAB ─────────────────────────────────────────────── */
function ProcessesTab({ clientId, client }) {
  const { data: processes, isLoading, error } = useProcesses(clientId)
  const deleteProcess = useDeleteProcess(clientId)
  const { user } = useAuth()

  const [selectedProcess, setSelectedProcess] = useState(null)
  const [showForm, setShowForm]               = useState(false)
  const [editingProcess, setEditingProcess]   = useState(null)  // null = create, object = edit
  const [confirmDelete, setConfirmDelete]     = useState(null)  // process object to delete

  // canEdit: SUPERADMIN or pod member of the client's pod
  const canEdit = user?.role === 'SUPERADMIN' || user?.zampian?.pod_id === client?.pod_id

  if (isLoading) return <div className="p-8 flex justify-center"><Spinner /></div>
  if (error) return <div className="p-6"><ErrorMessage message={error} /></div>

  if (selectedProcess) {
    return (
      <>
        <ProcessDetail
          clientId={clientId}
          processId={selectedProcess}
          onBack={() => setSelectedProcess(null)}
          canEdit={canEdit}
        />
        {/* Modals can still open from within detail but we handle them here */}
      </>
    )
  }

  const items = processes || []

  function handleDeleteConfirm() {
    if (!confirmDelete) return
    deleteProcess.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })
  }

  return (
    <div className="p-6">
      {/* New Process button — only for pod members */}
      {canEdit && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => { setEditingProcess(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-zamp-600 text-white rounded-xl hover:bg-zamp-700 transition-colors"
          >
            <Plus size={14} />New Process
          </button>
        </div>
      )}

      {items.length === 0 && !canEdit ? (
        <Empty title="No processes" sub="Processes for this client will appear here" />
      ) : items.length === 0 && canEdit ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {/* New Process card when list is empty */}
          <button
            onClick={() => { setEditingProcess(null); setShowForm(true) }}
            className="text-left bg-white border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-zamp-300 hover:bg-zamp-50/30 transition-all group flex items-center justify-center gap-2 h-24"
          >
            <Plus size={16} className="text-gray-300 group-hover:text-zamp-500 transition-colors" />
            <span className="text-[13px] text-gray-400 group-hover:text-zamp-600 font-medium transition-colors">Add first process</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map(p => (
            <div key={p.id} className="relative group">
              <button
                onClick={() => setSelectedProcess(p.id)}
                className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-zamp-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-zamp-50 flex items-center justify-center flex-shrink-0 group-hover:bg-zamp-100 transition-colors">
                    <Layers size={14} className="text-zamp-600" />
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <p className="text-[14px] font-semibold text-gray-800 leading-snug group-hover:text-zamp-700 transition-colors">
                      {p.name || p.process_name}
                    </p>
                    {p.poc_name && p.poc_name !== 'Unassigned' && (
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <User size={10} />{p.poc_name}
                      </p>
                    )}
                    {(p.open_action_item_count > 0 || p.open_blocker_count > 0) && (
                      <div className="flex items-center gap-2 mt-1.5">
                        {p.open_action_item_count > 0 && (
                          <span className="text-[10px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                            {p.open_action_item_count} action{p.open_action_item_count !== 1 ? 's' : ''}
                          </span>
                        )}
                        {p.open_blocker_count > 0 && (
                          <span className="text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">
                            {p.open_blocker_count} blocker{p.open_blocker_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Edit / Delete icons — only for pod members, shown on hover */}
              {canEdit && (
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); setEditingProcess(p); setShowForm(true) }}
                    title="Edit process"
                    className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-zamp-600 hover:border-zamp-300 transition-colors shadow-sm"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(p) }}
                    title="Delete process"
                    className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* + New Process card at end of grid */}
          {canEdit && (
            <button
              onClick={() => { setEditingProcess(null); setShowForm(true) }}
              className="text-left bg-white border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-zamp-300 hover:bg-zamp-50/30 transition-all group flex items-center justify-center gap-2 min-h-[88px]"
            >
              <Plus size={15} className="text-gray-300 group-hover:text-zamp-500 transition-colors" />
              <span className="text-[13px] text-gray-400 group-hover:text-zamp-600 font-medium transition-colors">New Process</span>
            </button>
          )}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <ProcessFormModal
          clientId={clientId}
          process={editingProcess}
          onClose={() => { setShowForm(false); setEditingProcess(null) }}
        />
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-[15px] font-semibold text-gray-900 mb-2">Delete process?</h3>
            <p className="text-[13px] text-gray-500 mb-5">
              <span className="font-semibold text-gray-700">"{confirmDelete.name || confirmDelete.process_name}"</span> and all its updates, action items, and blockers will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteProcess.isPending}
                className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteProcess.isPending
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Trash2 size={13} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── MAIN PAGE ─────────────────────────────────────────────────── */
export default function ClientDetail() {
  const { id: clientId } = useParams()
  const { user } = useAuth()
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
    { key:'overview',     label:'Overview',     icon: Circle,         count:0 },
    { key:'milestones',   label:'Milestones',   icon: Target,         count: (milestones||[]).filter(m=>!m.completed_at).length },
    { key:'tasks',        label:'Tasks',        icon: CheckCircle2,   count: (tasks||[]).filter(t=>!['done','completed','cancelled'].includes(t.status)).length },
    { key:'asks',         label:'Asks',         icon: MessageSquare,  count: (asks||[]).filter(a=>a.status==='open').length },
    { key:'commitments',  label:'Commitments',  icon: CheckCheck,     count: (commitments||[]).filter(c=>!['fulfilled','cancelled'].includes(c.status)).length },
    { key:'signals',      label:'Signals',      icon: Zap,            count: openSignals.length },
    { key:'meetings',     label:'Meetings',     icon: Calendar,       count: (meetings||[]).length },
    { key:'stakeholders', label:'Stakeholders', icon: Users,          count: (stakeholders||[]).length },
    { key:'processes',    label:'Processes',    icon: Layers,         count: 0 },
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
        {tab === 'processes'    && <ProcessesTab      clientId={clientId} client={client}/>}
      </div>
    </div>
  )
}
