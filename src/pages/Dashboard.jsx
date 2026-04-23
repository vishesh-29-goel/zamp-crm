import { useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Users, CheckSquare, ArrowRight, Zap, Clock, Bell, CheckCircle2, X, Building2, LayoutGrid } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useDashboardSummary, useSignals, useUpdateSignal, useUpdateTask, usePods } from '../lib/useApi'

import { useAuth } from '../lib/auth'
import HealthBadge from '../components/HealthBadge'
import StageBadge from '../components/StageBadge'
import Spinner from '../components/Spinner'
import OpenAsksPanel from '../components/OpenAsksPanel'
import TaskDetailPanel from '../components/TaskDetailPanel'

function fmt(n) {
  if (!n) return '$0'
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`
  return `$${n}`
}

function timeSince(ts) {
  if (!ts) return 'Never'
  const d = Math.floor((Date.now() - new Date(ts)) / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  return `${d}d ago`
}

function StatCard({ label, value, sub, color = 'text-gray-900', icon: Icon, iconColor }) {
  return (
    <div className="card flex items-start gap-4">
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor || 'bg-gray-100'}`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

const ARR_COLORS = ['#4f6ef7','#6b82f8','#8795f9','#a3a9fa','#bfbdfb','#d5d3fc','#e8e7fd']

const SIGNAL_LABEL = {
  follow_up_pending:    'Follow-up pending',
  commitment_at_risk:   'Commitment at risk',
  no_recent_contact:    'No recent contact',
  escalation_risk:      'Escalation risk',
  renewal_approaching:  'Renewal approaching',
}

// Roles that default to and can access Org View
const ORG_VIEW_ROLES = ['SUPERADMIN', 'CEO', 'GM']
// Roles that only ever see their own pod
const POD_ONLY_ROLES = ['ASA', 'ASM']

export default function Dashboard() {
  const { role, user } = useAuth()
  const { data: pods = [] } = usePods()

  // Determine if this user can toggle between views
  const canSeeOrgView = !role || ORG_VIEW_ROLES.includes(role)

  // Must be declared BEFORE useState that references it
  const userPodId = user?.zampian?.pod_id ?? null

  // Default view:
  //   - If user has a pod_id (any role, including SUPERADMIN/GM), land on pod view
  //   - CEO or roleless users with no pod_id land on org view
  const [viewMode, setViewMode] = useState(() =>
    (canSeeOrgView && !userPodId) ? 'org' : 'pod'
  )
  const [selectedPodId, setSelectedPodId] = useState(userPodId)
  const [attentionTab, setAttentionTab] = useState('overdue') // 'overdue' | 'soon' | 'risk'
  const [selectedTask, setSelectedTask] = useState(null)

  // The active pod filter: null = org view (no filter), podId = pod view
  const activePodId = viewMode === 'pod' ? (selectedPodId || userPodId) : null

  const { summary, clients, tasks, allClients, isLoading } = useDashboardSummary(activePodId)
  const { data: allSignals = [], isLoading: signalsLoading } = useSignals()
  const updateSignal = useUpdateSignal()
  const updateTask   = useUpdateTask()

  if (isLoading || signalsLoading) return (
    <div className="flex items-center justify-center h-96">
      <Spinner />
    </div>
  )

  // Active pod name for display
  const activePod = pods.find(p => String(p.id) === String(activePodId))
  const podLabel  = activePod?.name ?? 'My Pod'

  const healthOrder = { red: 0, yellow: 1, green: 2 }
  const topClients = [...clients]
    .filter(c => c.stage !== 'churned')
    .sort((a, b) => (healthOrder[a.health] ?? 3) - (healthOrder[b.health] ?? 3))
    .slice(0, 8)

  // ARR chart — top 7 clients with ARR > 0
  const arrData = [...clients]
    .filter(c => Number(c.arr) > 0)
    .sort((a, b) => Number(b.arr) - Number(a.arr))
    .slice(0, 7)
    .map(c => ({ name: c.name, arr: Number(c.arr) }))

  // Attention feed data
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2)

  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled')
  const overdueTasks = activeTasks.filter(t => t.due_date && new Date(t.due_date) < today)
  const dueSoonTasks = activeTasks.filter(t => {
    if (!t.due_date) return false
    const d = new Date(t.due_date); d.setHours(0, 0, 0, 0)
    return d >= today && d <= dayAfter
  })

  const podClientIds = new Set(clients.map(c => c.id))
  const HIGH_RISK_SIGNALS = ['commitment_at_risk', 'blocker', 'escalation_risk']
  const atRiskSignals = allSignals
    .filter(s => s.status === 'open' && HIGH_RISK_SIGNALS.includes(s.signal_type))
    .filter(s => !activePodId || podClientIds.has(s.client_id))

  const hasAttention = overdueTasks.length > 0 || dueSoonTasks.length > 0 || atRiskSignals.length > 0

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {viewMode === 'org' ? 'Global Dashboard' : `${podLabel} Dashboard`}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {viewMode === 'org'
              ? `Live snapshot across all ${allClients.length} clients · April 2026`
              : `Showing ${clients.length} client${clients.length !== 1 ? 's' : ''} in ${podLabel}`
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle — only shown if user can see both views */}
          {canSeeOrgView && (
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setViewMode('org')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'org'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Org
              </button>
              <button
                onClick={() => { setViewMode('pod'); if (!selectedPodId) setSelectedPodId(userPodId) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'pod'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Pod
              </button>
            </div>
          )}

          {/* Pod selector — only for org-level users in pod view */}
          {viewMode === 'pod' && canSeeOrgView && pods.length > 0 && (
            <select
              value={selectedPodId ?? ''}
              onChange={e => setSelectedPodId(e.target.value || null)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-zamp-500"
            >
              {pods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-green-400 inline-block animate-pulse" />
            Live data
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total ARR"
          value={fmt(summary.total_arr)}
          sub="contracted annual"
          color="text-zamp-600"
          icon={TrendingUp}
          iconColor="bg-zamp-50 text-zamp-500"
        />
        <StatCard
          label="Total Clients"
          value={summary.total_clients}
          sub={`${summary.live_clients} live · ${summary.health_green ?? 0} green · ${summary.health_yellow ?? 0} yellow · ${summary.health_red ?? 0} red`}
          icon={Users}
          iconColor="bg-blue-50 text-blue-500"
        />
        <StatCard
          label="Open Tasks"
          value={summary.open_tasks}
          sub={summary.overdue_tasks > 0 ? `${summary.overdue_tasks} overdue` : 'none overdue'}
          color={summary.overdue_tasks > 0 ? 'text-red-600' : 'text-gray-900'}
          icon={CheckSquare}
          iconColor={summary.overdue_tasks > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}
        />
        <StatCard
          label="At Risk"
          value={summary.health_red}
          sub="red health clients"
          color={summary.health_red > 0 ? 'text-red-600' : 'text-gray-900'}
          icon={Zap}
          iconColor={summary.health_red > 0 ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}
        />
      </div>

      {/* ── Attention Feed ── */}
      {/* ── Needs Attention ── */}
      {hasAttention && (
        <div className="card mb-6 border-l-4 border-l-red-400">

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 text-base">
                <Bell className="w-4 h-4 text-red-500" />
                Needs Your Attention
                <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                  {overdueTasks.length + dueSoonTasks.length + atRiskSignals.length}
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5 ml-6">Overdue work, upcoming deadlines, and high-risk signals</p>
            </div>
            <Link to="/signals" className="text-xs text-zamp-600 hover:underline flex items-center gap-1">
              All signals <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 border-b border-gray-100 -mx-5 px-5 mb-5">
            {[
              { id: 'overdue', label: 'Overdue',   count: overdueTasks.length,  Icon: Clock, activeColor: 'text-red-600 border-red-400',    countCls: 'bg-red-100 text-red-700' },
              { id: 'soon',    label: 'Due Soon',  count: dueSoonTasks.length,  Icon: Clock, activeColor: 'text-amber-600 border-amber-400', countCls: 'bg-amber-100 text-amber-700' },
              { id: 'risk',    label: 'At Risk',   count: atRiskSignals.length, Icon: Zap,   activeColor: 'text-purple-600 border-purple-400', countCls: 'bg-purple-100 text-purple-700' },
            ].map(({ id, label, count, Icon, activeColor, countCls }) => {
              const isActive = attentionTab === id
              return (
                <button
                  key={id}
                  onClick={() => setAttentionTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                    isActive ? `${activeColor}` : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? countCls : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Overdue Tasks */}
          {attentionTab === 'overdue' && (
            overdueTasks.length === 0
              ? <div className="py-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500">No overdue tasks</p>
                  <p className="text-xs text-gray-400 mt-0.5">You're on top of everything.</p>
                </div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {overdueTasks.map(t => (
                    <div key={`od-${t.id}`} onClick={() => setSelectedTask(t)} className="group flex flex-col justify-between rounded-xl border border-red-200 bg-red-50/30 p-4 hover:border-red-300 hover:shadow-sm transition-all min-h-[110px] cursor-pointer">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-red-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Overdue
                          </span>
                          <span className="text-[10px] text-red-400 font-medium">
                            {new Date(t.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{t.title}</p>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-400 truncate max-w-[65%]">{t.client_name ?? '—'}</span>
                        <button
                          onClick={e => { e.stopPropagation(); updateTask.mutate({ id: t.id, status: 'done' }) }}
                          disabled={updateTask.isPending}
                          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded-lg hover:bg-green-50 disabled:opacity-30"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Done
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
          )}

          {/* Due Soon Tasks */}
          {attentionTab === 'soon' && (
            dueSoonTasks.length === 0
              ? <div className="py-10 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500">Nothing due in the next 48 hours</p>
                </div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {dueSoonTasks.map(t => {
                    const d = new Date(t.due_date); d.setHours(0,0,0,0)
                    const isToday = d.getTime() === today.getTime()
                    return (
                      <div key={`soon-${t.id}`} onClick={() => setSelectedTask(t)} className="group flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/30 p-4 hover:border-amber-300 hover:shadow-sm transition-all min-h-[110px] cursor-pointer">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 ${isToday ? 'text-amber-600' : 'text-amber-400'}`}>
                              <Clock className="w-3 h-3" /> {isToday ? 'Due Today' : 'Due Tomorrow'}
                            </span>
                            <span className="text-[10px] text-amber-400 font-medium">
                              {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{t.title}</p>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-gray-400 truncate max-w-[65%]">{t.client_name ?? '—'}</span>
                          <button
                            onClick={e => { e.stopPropagation(); updateTask.mutate({ id: t.id, status: 'done' }) }}
                            disabled={updateTask.isPending}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium px-2 py-1 rounded-lg hover:bg-green-50 disabled:opacity-30"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Done
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
          )}

          {/* At Risk Signals */}
          {attentionTab === 'risk' && (
            atRiskSignals.length === 0
              ? <div className="py-10 text-center">
                  <Zap className="w-8 h-8 text-purple-200 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-500">No high-risk signals</p>
                  <p className="text-xs text-gray-400 mt-0.5">Blockers and commitment risks will appear here.</p>
                </div>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {atRiskSignals.map(s => {
                    const isBlocker = s.signal_type === 'blocker'
                    return (
                      <div key={`risk-${s.id}`} className={`group flex flex-col justify-between rounded-xl border p-4 hover:shadow-sm transition-all min-h-[130px] ${
                        isBlocker ? 'border-orange-200 bg-orange-50/30 hover:border-orange-300' : 'border-purple-200 bg-purple-50/30 hover:border-purple-300'
                      }`}>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-semibold uppercase tracking-wide flex items-center gap-1 ${isBlocker ? 'text-orange-500' : 'text-purple-500'}`}>
                              <Zap className="w-3 h-3" /> {isBlocker ? 'Blocker' : 'Commitment at Risk'}
                            </span>
                            <span className="text-[10px] font-medium text-gray-400 truncate max-w-[45%]">{s.client_name ?? '—'}</span>
                          </div>
                          <p className="text-xs font-medium text-gray-800 leading-snug line-clamp-3">{s.notes ?? s.signal_text ?? '—'}</p>
                        </div>
                        <div className="flex items-center justify-end mt-3">
                          <button
                            onClick={() => updateSignal.mutate({ id: s.id, status: 'dismissed' })}
                            disabled={updateSignal.isPending}
                            className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                          >
                            <X className="w-3.5 h-3.5" /> Dismiss
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
          )}

        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Client list */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-400" /> Clients by priority
            </h2>
            <Link to={activePodId ? `/clients?pod=${activePodId}` : '/clients'} className="text-xs text-zamp-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border-subtle">
            {topClients.map(c => (
              <Link
                key={c.id}
                to={`/clients/${c.id}`}
                className="flex items-center justify-between py-3 hover:bg-surface-page -mx-5 px-5 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zamp-100 to-zamp-50 flex items-center justify-center text-xs font-bold text-zamp-600 flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 group-hover:text-zamp-600 transition-colors">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.pod_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.arr && <span className="text-sm font-semibold text-gray-700">{fmt(Number(c.arr))}</span>}
                  <StageBadge stage={c.stage} />
                  <HealthBadge health={c.health} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Stage breakdown */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-zamp-500" /> Pipeline
            </h2>
            {['live','poc','pilot','prospect','churned'].map(stage => {
              const count = clients.filter(c => c.stage === stage).length
              return count > 0 ? (
                <div key={stage} className="flex items-center justify-between py-2 border-b last:border-0 border-gray-50">
                  <StageBadge stage={stage} />
                  <span className="text-sm font-semibold text-gray-700">{count}</span>
                </div>
              ) : null
            })}
          </div>
        </div>
      </div>

      {/* Open Asks — full width, capped height with internal scroll */}
      <div className="max-h-[520px] overflow-y-auto rounded-2xl mb-6 scrollbar-thin scrollbar-thumb-gray-200">
        <OpenAsksPanel podId={activePodId} />
      </div>

      {/* ARR by client chart */}
      {arrData.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-5">ARR by Client (Top {arrData.length})</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={arrData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={v => `$${v/1000}k`} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                formatter={(v) => [fmt(v), 'ARR']}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="arr" radius={[4, 4, 0, 0]}>
                {arrData.map((_, i) => <Cell key={i} fill={ARR_COLORS[i % ARR_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}
