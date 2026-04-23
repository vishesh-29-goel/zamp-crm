import { useState } from 'react'
import { useApprovals, useResolveApproval, usePodTransfers, useResolvePodTransfer } from '../lib/useApi'
import { useAuth } from '../lib/auth'
import Spinner from '../components/Spinner'
import HealthBadge from '../components/HealthBadge'
import { CheckCircle2, XCircle, Clock, ShieldAlert, ChevronDown, ChevronUp, ArrowRightLeft } from 'lucide-react'

// ─── Field display helpers ────────────────────────────────────────────────────

const FIELD_LABEL = {
  health: 'Health',
  stage:  'Stage',
  arr:    'ARR',
}

function FieldValue({ field, value }) {
  if (field === 'health') return <HealthBadge health={value} />
  if (field === 'arr')    return <span className="font-semibold text-gray-900">${Number(value).toLocaleString()}</span>
  return <span className="font-semibold text-gray-900 capitalize">{value}</span>
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  pending:  { cls: 'bg-amber-100 text-amber-700',  label: 'Pending'  },
  approved: { cls: 'bg-green-100 text-green-700',  label: 'Approved' },
  rejected: { cls: 'bg-red-100   text-red-700',    label: 'Rejected' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>
      {s.label}
    </span>
  )
}

// ─── Single approval card ─────────────────────────────────────────────────────

function ApprovalCard({ approval, canAct, onDecision }) {
  const [expanded, setExpanded]   = useState(false)
  const [note, setNote]           = useState('')
  const [acting, setActing]       = useState(null) // 'approved' | 'rejected'

  const isPending = approval.status === 'pending'

  const changes = (() => {
    try { return typeof approval.proposed_changes === 'string'
      ? JSON.parse(approval.proposed_changes)
      : approval.proposed_changes || {}
    } catch { return {} }
  })()

  const original = (() => {
    try { return typeof approval.original_values === 'string'
      ? JSON.parse(approval.original_values)
      : approval.original_values || {}
    } catch { return {} }
  })()

  async function handleDecision(decision) {
    setActing(decision)
    try {
      await onDecision(approval.id, decision, note)
    } finally {
      setActing(null)
      setNote('')
    }
  }

  const requestedAt = approval.created_at
    ? new Date(approval.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  return (
    <div className={`card border transition-all ${!isPending ? 'opacity-60' : ''}`}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ShieldAlert className={`w-4 h-4 flex-shrink-0 ${isPending ? 'text-amber-500' : 'text-gray-300'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">
                {approval.client_name || `Client #${approval.client_id}`}
              </span>
              <StatusBadge status={approval.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Requested by <span className="font-medium text-gray-700">{approval.requester_name || approval.requester_id}</span>
              {' · '}{requestedAt}
            </p>
          </div>
        </div>

        {/* Change summary — always visible */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {Object.entries(changes).map(([field, newVal]) => (
            <div key={field} className="text-right hidden sm:block">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{FIELD_LABEL[field] || field}</p>
              <div className="flex items-center gap-1.5 justify-end mt-0.5">
                {original[field] != null && (
                  <>
                    <FieldValue field={field} value={original[field]} />
                    <span className="text-gray-300 text-xs">→</span>
                  </>
                )}
                <FieldValue field={field} value={newVal} />
              </div>
            </div>
          ))}

          <button
            onClick={() => setExpanded(v => !v)}
            className="p-1.5 rounded-lg hover:bg-surface-page text-gray-400 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded detail + action area */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-border-subtle space-y-4">
          {/* Full change table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 font-medium uppercase tracking-wide">
                  <th className="pb-2 pr-8">Field</th>
                  <th className="pb-2 pr-8">Current</th>
                  <th className="pb-2">Proposed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {Object.entries(changes).map(([field, newVal]) => (
                  <tr key={field}>
                    <td className="py-2 pr-8 text-gray-500 font-medium">{FIELD_LABEL[field] || field}</td>
                    <td className="py-2 pr-8"><FieldValue field={field} value={original[field] ?? '—'} /></td>
                    <td className="py-2"><FieldValue field={field} value={newVal} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Reviewer info */}
          {approval.reviewer_name && (
            <p className="text-xs text-gray-400">
              Assigned to <span className="font-medium text-gray-600">{approval.reviewer_name}</span>
              {approval.reviewed_at && ` · Reviewed ${new Date(approval.reviewed_at).toLocaleDateString()}`}
            </p>
          )}

          {/* Note / resolution details for resolved approvals */}
          {!isPending && approval.reviewer_note && (
            <div className="bg-surface-page rounded-lg px-3 py-2 text-sm text-gray-600 italic">
              "{approval.reviewer_note}"
            </div>
          )}

          {/* Action buttons — only for pending + authorised reviewers */}
          {isPending && canAct && (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Note (optional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a reason or comment…"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-500/30 focus:border-zamp-500 placeholder:text-gray-300"
                />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDecision('rejected')}
                  disabled={!!acting}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                >
                  {acting === 'rejected'
                    ? <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <XCircle className="w-3.5 h-3.5" />}
                  Reject
                </button>
                <button
                  onClick={() => handleDecision('approved')}
                  disabled={!!acting}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {acting === 'approved'
                    ? <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Pod Transfer Card ────────────────────────────────────────────────────────

const TRANSFER_STATUS_STYLE = {
  pending:  { cls: 'bg-amber-100 text-amber-700',  label: 'Pending'  },
  approved: { cls: 'bg-green-100 text-green-700',  label: 'Approved' },
  rejected: { cls: 'bg-red-100   text-red-700',    label: 'Rejected' },
}

function PodTransferCard({ transfer, canAct, onDecision }) {
  const [expanded, setExpanded] = useState(false)
  const [note, setNote]         = useState('')
  const [acting, setActing]     = useState(null)

  const isPending = transfer.status === 'pending'
  const s = TRANSFER_STATUS_STYLE[transfer.status] || TRANSFER_STATUS_STYLE.pending

  const requestedAt = transfer.created_at
    ? new Date(transfer.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

  async function handleDecision(decision) {
    setActing(decision)
    try { await onDecision(transfer.id, decision, note) }
    finally { setActing(null); setNote('') }
  }

  return (
    <div className={`card border transition-all ${!isPending ? 'opacity-60' : 'border-violet-200'}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <ArrowRightLeft className={`w-4 h-4 flex-shrink-0 ${isPending ? 'text-violet-500' : 'text-gray-300'}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-900">{transfer.client_name}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
              <span className="text-xs text-gray-400 font-medium">
                {transfer.from_pod_name} → {transfer.to_pod_name}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Requested by <span className="font-medium text-gray-700">{transfer.requested_by_name}</span>
              {' · '}{requestedAt}
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1.5 rounded-lg hover:bg-surface-page text-gray-400 transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border-subtle space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Client</p>
              <p className="font-semibold text-gray-900">{transfer.client_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">From</p>
              <p className="font-semibold text-gray-900">{transfer.from_pod_name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">To</p>
              <p className="font-semibold text-gray-900">{transfer.to_pod_name}</p>
            </div>
          </div>

          {transfer.note && (
            <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 italic">
              "{transfer.note}"
            </div>
          )}

          {transfer.reviewer_name && (
            <p className="text-xs text-gray-400">
              Assigned to <span className="font-medium text-gray-600">{transfer.reviewer_name}</span>
              {transfer.resolved_at && ` · Resolved ${new Date(transfer.resolved_at).toLocaleDateString()}`}
            </p>
          )}

          {!isPending && transfer.reviewer_note && (
            <div className="bg-surface-page rounded-lg px-3 py-2 text-sm text-gray-600 italic">
              "{transfer.reviewer_note}"
            </div>
          )}

          {isPending && canAct && (
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Note (optional)</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add a reason or comment…"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-zamp-500/30 focus:border-zamp-500 placeholder:text-gray-300"
                />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => handleDecision('rejected')}
                  disabled={!!acting}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                >
                  {acting === 'rejected'
                    ? <span className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <XCircle className="w-3.5 h-3.5" />}
                  Reject
                </button>
                <button
                  onClick={() => handleDecision('approved')}
                  disabled={!!acting}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {acting === 'approved'
                    ? <span className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                    : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Approve
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const APPROVER_ROLES = ['CEO', 'GM', 'SUPERADMIN']

export default function Approvals() {
  const { role, user } = useAuth()
  const [filter, setFilter] = useState('pending')
  const [transferFilter, setTransferFilter] = useState('pending')

  const { data: approvals = [], isLoading } = useApprovals()
  const resolve = useResolveApproval()

  const { data: transfers = [], isLoading: tLoading } = usePodTransfers()
  const resolveTransfer = useResolvePodTransfer()

  const canAct = APPROVER_ROLES.includes(role)

  // Only non-C2C GMs (receiving pod GMs), CEOs, and SUPERADMINs can approve transfers
  const C2C_POD_ID = 4
  const canActOnTransfers =
    role === 'SUPERADMIN' || role === 'CEO' ||
    (role === 'GM' && Number(user?.zampian?.pod_id) !== C2C_POD_ID)

  const pending  = approvals.filter(a => a.status === 'pending')
  const approved = approvals.filter(a => a.status === 'approved')
  const rejected = approvals.filter(a => a.status === 'rejected')

  const visible = filter === 'pending'  ? pending
                : filter === 'approved' ? approved
                : filter === 'rejected' ? rejected
                : approvals

  const tPending  = transfers.filter(t => t.status === 'pending')
  const tApproved = transfers.filter(t => t.status === 'approved')
  const tRejected = transfers.filter(t => t.status === 'rejected')

  const tVisible = transferFilter === 'pending'  ? tPending
                 : transferFilter === 'approved' ? tApproved
                 : transferFilter === 'rejected' ? tRejected
                 : transfers

  async function handleDecision(id, decision, note) {
    await resolve.mutateAsync({ id, decision, note })
  }

  async function handleTransferDecision(id, status, reviewer_note) {
    await resolveTransfer.mutateAsync({ id, status, reviewer_note })
  }

  if (isLoading || tLoading) {
    return <div className="flex items-center justify-center h-96"><Spinner /></div>
  }

  // Non-approver read-only view — they can see what they submitted
  const readOnly = !canAct

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Approval Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {readOnly
            ? 'Changes to health, stage, and ARR require GM or CEO approval.'
            : `${pending.length} pending · ${approved.length} approved · ${rejected.length} rejected`}
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center py-4 border-t-4 border-t-amber-400">
          <div className="text-2xl font-bold text-amber-600">{pending.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </div>
        </div>
        <div className="card text-center py-4 border-t-4 border-t-green-400">
          <div className="text-2xl font-bold text-green-600">{approved.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </div>
        </div>
        <div className="card text-center py-4 border-t-4 border-t-red-400">
          <div className="text-2xl font-bold text-red-600">{rejected.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium flex items-center justify-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-surface-page p-1 rounded-xl w-fit">
        {[
          { key: 'pending',  label: 'Pending',  count: pending.length  },
          { key: 'approved', label: 'Approved', count: approved.length },
          { key: 'rejected', label: 'Rejected', count: rejected.length },
          { key: 'all',      label: 'All',      count: approvals.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5
              ${filter === t.key
                ? 'bg-white text-gray-900 shadow-sm border border-border'
                : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                ${filter === t.key ? 'bg-zamp-100 text-zamp-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="card py-16 text-center">
          <ShieldAlert className="w-8 h-8 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">
            {filter === 'pending' ? 'No pending approvals — all clear!' : `No ${filter} approvals.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...visible]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map(approval => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                canAct={canAct}
                onDecision={handleDecision}
              />
            ))}
        </div>
      )}

      {/* Non-approver notice */}
      {readOnly && (
        <p className="text-xs text-gray-400 text-center mt-8">
          You can view approval history but only GMs and the CEO can approve or reject.
        </p>
      )}

      {/* ── Pod Transfers Section ─────────────────────────────────────────── */}
      {transfers.length > 0 && (
        <div className="mt-12">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-6">
            <ArrowRightLeft className="w-5 h-5 text-violet-500" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Pod Transfers</h2>
              <p className="text-sm text-gray-500">Requests to move clients from C2C to a revenue pod</p>
            </div>
          </div>

          {/* Mini stat strip */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card text-center py-3 border-t-4 border-t-amber-400">
              <div className="text-xl font-bold text-amber-600">{tPending.length}</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Pending
              </div>
            </div>
            <div className="card text-center py-3 border-t-4 border-t-green-400">
              <div className="text-xl font-bold text-green-600">{tApproved.length}</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Approved
              </div>
            </div>
            <div className="card text-center py-3 border-t-4 border-t-red-400">
              <div className="text-xl font-bold text-red-600">{tRejected.length}</div>
              <div className="text-xs text-gray-500 mt-0.5 font-medium flex items-center justify-center gap-1">
                <XCircle className="w-3 h-3" /> Rejected
              </div>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mb-4 bg-surface-page p-1 rounded-xl w-fit">
            {[
              { key: 'pending',  label: 'Pending',  count: tPending.length  },
              { key: 'approved', label: 'Approved', count: tApproved.length },
              { key: 'rejected', label: 'Rejected', count: tRejected.length },
              { key: 'all',      label: 'All',      count: transfers.length },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTransferFilter(t.key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5
                  ${transferFilter === t.key
                    ? 'bg-white text-gray-900 shadow-sm border border-border'
                    : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold
                    ${transferFilter === t.key ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Transfer cards */}
          {tVisible.length === 0 ? (
            <div className="card py-12 text-center">
              <ArrowRightLeft className="w-7 h-7 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-400">
                {transferFilter === 'pending' ? 'No pending pod transfers.' : `No ${transferFilter} transfers.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...tVisible]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .map(t => (
                  <PodTransferCard
                    key={t.id}
                    transfer={t}
                    canAct={canActOnTransfers}
                    onDecision={handleTransferDecision}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
