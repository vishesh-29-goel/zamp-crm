import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Mail, RefreshCw, ExternalLink, X, Search, RotateCcw } from 'lucide-react'
import { api } from '../lib/api'
import { formatDistanceToNow, format, subDays } from 'date-fns'
import EmailMessageModal from '../components/EmailMessageModal'

const STATUS_LABELS = {
  sent_no_reply:     'No Reply',
  positive_reply:    'Positive',
  neutral_reply:     'Neutral',
  negative_reply:    'Negative',
  meeting_scheduled: 'Meeting',
  bounced:           'Bounced',
}
const STATUS_COLORS = {
  sent_no_reply:     'bg-slate-100 text-slate-600',
  positive_reply:    'bg-emerald-100 text-emerald-700',
  neutral_reply:     'bg-slate-100 text-slate-600',
  negative_reply:    'bg-red-100 text-red-700',
  meeting_scheduled: 'bg-blue-100 text-blue-700',
  bounced:           'bg-red-200 text-red-800',
}
const VALID_STATUSES = Object.keys(STATUS_LABELS)
const DATE_PRESETS = [
  { label: '7d',  days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: null },
]

function StatusPill({ thread, onStatusChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${STATUS_COLORS[thread.status] || 'bg-gray-100 text-gray-600'}`}
      >
        {STATUS_LABELS[thread.status] || thread.status}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px]">
            {VALID_STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { onStatusChange(thread, s); setOpen(false) }}
                className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                <span className={`px-1.5 py-0.5 rounded text-xs ${STATUS_COLORS[s]}`}>{STATUS_LABELS[s]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const toggle = (v) => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white hover:bg-gray-50 min-w-[100px]"
      >
        {selected.length > 0 ? `${label} (${selected.length})` : label}
        <span className="ml-auto text-gray-400">▾</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute z-40 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] max-h-[240px] overflow-y-auto">
            {options.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No options</p>}
            {options.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={() => toggle(opt.value)}
                  className="rounded"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function KebabMenu({ thread, onCopyLink, onMarkOverride }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100"
      >⋯</button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[160px]">
            <button onClick={e => { e.stopPropagation(); onCopyLink(); setOpen(false) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700">Copy Gmail link</button>
            <button onClick={e => { e.stopPropagation(); onMarkOverride(); setOpen(false) }}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 text-gray-700">Mark as override</button>
          </div>
        </>
      )}
    </div>
  )
}

// ThreadDrawer replaced by EmailMessageModal (centered modal)

function Toast({ message, type, onDismiss }) {
  return (
    <div className={`fixed bottom-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium
      ${type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
      {message}
      <button onClick={onDismiss} className="ml-3 opacity-60 hover:opacity-100">✕</button>
    </div>
  )
}

const EMPTY_FILTERS = {
  q: '', clientIds: [], aeOwners: [], statuses: [],
  datePreset: 'All', dateFrom: '', dateTo: '',
  hasReply: 'any', stale14d: false,
}

export default function EmailReachOut() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [toast, setToast] = useState(null)
  const [activeThread, setActiveThread] = useState(null)
  const [optimisticOverrides, setOptimisticOverrides] = useState({})

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const setFilter = (key, val) => { setFilters(f => ({ ...f, [key]: val })); setPage(1) }
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setPage(1) }

  // Compute date_from from preset
  const dateFrom = useMemo(() => {
    if (filters.datePreset === 'Custom') return filters.dateFrom
    const preset = DATE_PRESETS.find(p => p.label === filters.datePreset)
    if (!preset || preset.days === null) return undefined
    return format(subDays(new Date(), preset.days), 'yyyy-MM-dd')
  }, [filters.datePreset, filters.dateFrom])

  const apiParams = {
    page, page_size: 50,
    ...(filters.q        ? { q: filters.q }                                  : {}),
    ...(filters.clientIds.length  ? { client_id: filters.clientIds.join(',')  } : {}),
    ...(filters.aeOwners.length   ? { ae_owner:  filters.aeOwners.join(',')   } : {}),
    ...(filters.statuses.length   ? { status:    filters.statuses.join(',')   } : {}),
    ...(filters.hasReply !== 'any' ? { has_reply: filters.hasReply }          : {}),
    ...(filters.stale14d ? { stale_14d: 'true' }                              : {}),
    ...(dateFrom         ? { date_from: dateFrom }                            : {}),
    ...(filters.datePreset === 'Custom' && filters.dateTo ? { date_to: filters.dateTo } : {}),
  }

  const { data: stats } = useQuery({
    queryKey: ['email-reach-out-stats', apiParams],
    queryFn: () => api.emailReachOutStats(apiParams),
  })

  const { data: filterOptions } = useQuery({
    queryKey: ['email-reach-out-filters'],
    queryFn: () => api.emailReachOutFilters(),
    staleTime: 60_000,
  })

  const { data: threadsData, isError } = useQuery({
    queryKey: ['email-reach-out-threads', apiParams],
    queryFn: () => api.emailReachOutThreads(apiParams),
  })

  const threads = threadsData?.rows || []
  const total   = threadsData?.total || 0

  const clientOptions = (filterOptions?.clients || []).map(c => ({ value: String(c.id), label: c.name }))
  const aeOptions     = (filterOptions?.ae_owners || []).map(e => ({ value: e, label: e }))

  const patchStatus = useMutation({
    mutationFn: ({ id, status, status_reason }) => api.emailReachOutPatchStatus(id, { status, status_reason }),
    onSuccess: (updated, { id, status }) => {
      setOptimisticOverrides(prev => ({ ...prev, [id]: { status, overridden: true } }))
      qc.invalidateQueries({ queryKey: ['email-reach-out-threads'] })
      qc.invalidateQueries({ queryKey: ['email-reach-out-stats'] })
      showToast('Status updated')
    },
    onError: (err, { id }) => {
      setOptimisticOverrides(prev => { const n = { ...prev }; delete n[id]; return n })
      showToast(`Error: ${err.message || 'Failed to update status'}`, 'error')
    },
  })

  const triggerRefresh = useMutation({
    mutationFn: () => api.emailReachOutRefresh(),
    onSuccess: () => {
      showToast('Refresh queued — data will update shortly')
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['email-reach-out-threads'] })
        qc.invalidateQueries({ queryKey: ['email-reach-out-stats'] })
      }, 5000)
    },
    onError: () => showToast('Refresh failed', 'error'),
  })

  const totalThreads = parseInt(stats?.total_threads   || 0, 10)
  const withReply    = parseInt(stats?.threads_with_reply || 0, 10)
  const positive     = parseInt(stats?.positive_threads || 0, 10)
  const stale14d     = parseInt(stats?.stale_14d || 0, 10)
  const repliedPct   = totalThreads > 0 ? Math.round((withReply / totalThreads) * 100) : 0
  const positivePct  = totalThreads > 0 ? Math.round((positive / totalThreads) * 100) : 0

  const hasActiveFilters = filters.q || filters.clientIds.length || filters.aeOwners.length ||
    filters.statuses.length || filters.datePreset !== 'All' || filters.hasReply !== 'any' || filters.stale14d

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 font-medium">Failed to load email reach-out data.</p>
        <p className="text-sm text-gray-500 mt-1">Please try refreshing the page.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-gray-900">Email Reach Out</h1>
        </div>
        <button
          onClick={() => triggerRefresh.mutate()}
          disabled={triggerRefresh.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${triggerRefresh.isPending ? 'animate-spin' : ''}`} />
          Refresh now
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiCard label="Total Threads" value={totalThreads} />
        <KpiCard label="Replied %"     value={`${repliedPct}%`} />
        <KpiCard label="Positive %"    value={`${positivePct}%`} />
        <KpiCard label="Stale > 14d"   value={stale14d} />
      </div>

      {/* Filter bar — sticky */}
      <div className="sticky top-0 z-20 bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-shrink-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search subject, POC…"
            value={filters.q}
            onChange={e => setFilter('q', e.target.value)}
            className="text-sm border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 bg-white w-52 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Client multi-select */}
        <MultiSelect label="Client" options={clientOptions} selected={filters.clientIds}
          onChange={v => setFilter('clientIds', v)} />

        {/* AE multi-select */}
        <MultiSelect label="AE Owner" options={aeOptions} selected={filters.aeOwners}
          onChange={v => setFilter('aeOwners', v)} />

        {/* Status multi-select */}
        <MultiSelect
          label="Status"
          options={VALID_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }))}
          selected={filters.statuses}
          onChange={v => setFilter('statuses', v)}
        />

        {/* Date preset chips */}
        <div className="flex gap-1">
          {DATE_PRESETS.map(p => (
            <button key={p.label}
              onClick={() => setFilter('datePreset', p.label)}
              className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors
                ${filters.datePreset === p.label ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >{p.label}</button>
          ))}
          <button
            onClick={() => setFilter('datePreset', 'Custom')}
            className={`px-2.5 py-1 text-xs rounded-lg border font-medium
              ${filters.datePreset === 'Custom' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >Custom</button>
        </div>
        {filters.datePreset === 'Custom' && (
          <div className="flex items-center gap-1.5">
            <input type="date" value={filters.dateFrom} onChange={e => setFilter('dateFrom', e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white" />
            <span className="text-xs text-gray-400">→</span>
            <input type="date" value={filters.dateTo} onChange={e => setFilter('dateTo', e.target.value)}
              className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white" />
          </div>
        )}

        {/* Has reply toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          {['any','yes','no'].map(v => (
            <button key={v}
              onClick={() => setFilter('hasReply', v)}
              className={`px-2.5 py-1.5 capitalize font-medium transition-colors
                ${filters.hasReply === v ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >{v === 'any' ? 'Any Reply' : v === 'yes' ? 'Has Reply' : 'No Reply'}</button>
          ))}
        </div>

        {/* Stale 14d toggle */}
        <button
          onClick={() => setFilter('stale14d', !filters.stale14d)}
          className={`px-2.5 py-1.5 text-xs rounded-lg border font-medium transition-colors
            ${filters.stale14d ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >Stale &gt; 14d</button>

        {/* Reset */}
        {hasActiveFilters && (
          <button onClick={resetFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}

        <span className="ml-auto text-xs text-gray-500">{total} thread{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Thread table */}
      {threads.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          {hasActiveFilters
            ? <p className="text-gray-500 text-sm">No threads match the current filters. <button onClick={resetFilters} className="text-indigo-600 underline">Clear filters</button></p>
            : <p className="text-gray-500 text-sm">No email threads yet — the agent runs every 4 hours. Click <strong>Refresh now</strong> to pull the latest.</p>
          }
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Client','POC','Subject','AE Owner','Status','Reason','Last Activity','Replies','Actions'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {threads.map(thread => {
                const ov = optimisticOverrides[thread.id]
                const displayThread = ov ? { ...thread, status: ov.status } : thread
                const clientLabel = thread.client_name || thread.client_name_raw
                return (
                  <tr key={thread.id} onClick={() => setActiveThread(thread)} className="hover:bg-gray-50 cursor-pointer">
                    {/* Client */}
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      {thread.client_id ? (
                        <a href={`/clients/${thread.client_id}`} onClick={e => e.stopPropagation()}
                           className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs hover:underline">
                          {clientLabel || `Client ${thread.client_id}`}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">{clientLabel || '—'}</span>
                      )}
                    </td>
                    {/* POC */}
                    <td className="px-3 py-2.5">
                      <div title={thread.poc_email} className="text-xs">
                        <p className="font-medium text-gray-800">{thread.poc_name || '—'}</p>
                        <p className="text-gray-400 truncate max-w-[120px]">{thread.poc_email}</p>
                      </div>
                    </td>
                    {/* Subject */}
                    <td className="px-3 py-2.5 max-w-[200px]">
                      {thread.gmail_link ? (
                        <a href={thread.gmail_link} target="_blank" rel="noreferrer"
                           onClick={e => e.stopPropagation()}
                           className="text-xs text-indigo-600 hover:underline truncate block">
                          {thread.subject || '(no subject)'}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-700 truncate block">{thread.subject || '—'}</span>
                      )}
                    </td>
                    {/* AE Owner */}
                    <td className="px-3 py-2.5">
                      {thread.ae_owner_email ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {thread.ae_owner_email.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-600 truncate max-w-[80px]">{thread.ae_owner_email}</span>
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    {/* Status */}
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <div className="flex flex-col gap-0.5">
                        <StatusPill thread={displayThread}
                          onStatusChange={(t, s) => patchStatus.mutate({ id: t.id, status: s, status_reason: '' })} />
                        {(displayThread.status_overridden_by || ov?.overridden) && (
                          <span className="text-[10px] text-gray-400">
                            overridden by {thread.overridden_by_name || 'user'}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Reason */}
                    <td className="px-3 py-2.5 max-w-[120px]">
                      <span title={thread.status_reason || ''} className="text-xs text-gray-500 truncate block">
                        {thread.status_reason
                          ? thread.status_reason.slice(0, 60) + (thread.status_reason.length > 60 ? '…' : '')
                          : '—'}
                      </span>
                    </td>
                    {/* Last activity */}
                    <td className="px-3 py-2.5">
                      {thread.last_activity_at ? (
                        <span title={format(new Date(thread.last_activity_at), 'PPpp')} className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(thread.last_activity_at), { addSuffix: true })}
                        </span>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>
                    {/* Replies */}
                    <td className="px-3 py-2.5 align-top">
                      <div className="flex flex-col gap-0.5">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium w-fit">
                          {thread.external_reply_count ?? 0}
                        </span>
                        <span className="text-[10px] text-gray-500 leading-tight">Inbound: {thread.inbound_count ?? 0}</span>
                        <span className="text-[10px] text-gray-500 leading-tight">Outbound: {thread.outbound_count ?? 0}</span>
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                      <KebabMenu thread={thread}
                        onCopyLink={() => navigator.clipboard.writeText(thread.gmail_link || '')}
                        onMarkOverride={() => setActiveThread(thread)} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {total > 50 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <span className="text-xs text-gray-500">
                Showing {(page - 1) * 50 + 1}–{Math.min(page * 50, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-40">Prev</button>
                <button disabled={page * 50 >= total} onClick={() => setPage(p => p + 1)}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Centered email message modal */}
      {activeThread && (
        <EmailMessageModal
          thread={activeThread}
          onClose={() => setActiveThread(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  )
}
