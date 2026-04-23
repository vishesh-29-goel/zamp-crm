import { useState } from 'react'
import { useAuth } from '../lib/auth'
import {
  useZampians, useUpdateZampian, usePodsList,
  useProfileChangeRequests, useCreateProfileChangeRequest, useReviewProfileChangeRequest,
} from '../lib/useApi'
import Spinner from '../components/Spinner'
import {
  Users, Shield, CheckCircle2, XCircle, RefreshCw,
  User, Clock, CheckCheck, Ban,
} from 'lucide-react'

const ROLES = ['ASA', 'ASM', 'GM', 'CEO', 'SUPERADMIN']
// Display label → backend field name
const FIELD_MAP = { name: 'name', pod: 'pod_id', role: 'role', active: 'is_active' }
const CHANGEABLE_FIELDS = Object.keys(FIELD_MAP)

const ROLE_COLOR = {
  ASA:        'bg-gray-100    text-gray-600',
  ASM:        'bg-blue-100    text-blue-700',
  GM:         'bg-purple-100  text-purple-700',
  CEO:        'bg-amber-100   text-amber-700',
  SUPERADMIN: 'bg-red-100     text-red-700',
}

// ── ZampianRow ──────────────────────────────────────────────────────────────

function ZampianRow({ zampian, pods, onUpdate, isPending }) {
  const { user } = useAuth()
  const isSuperadmin = user?.zampian?.role === 'SUPERADMIN'
  const podOptions = pods?.map(p => p.name) ?? []

  // Edit state — local draft, only committed on Save
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState({})

  function startEdit() {
    setDraft({
      role:      zampian.role,
      pod_name:  zampian.pod_name ?? '',
      is_active: zampian.is_active,
    })
    setEditing(true)
  }

  function cancelEdit() {
    setDraft({})
    setEditing(false)
  }

  function saveEdit() {
    const patch = {}
    if (draft.role !== zampian.role)           patch.role      = draft.role
    if (draft.is_active !== zampian.is_active) patch.is_active = draft.is_active
    if (draft.pod_name !== (zampian.pod_name ?? '')) {
      const podObj = pods?.find(p => p.name === draft.pod_name)
      patch.pod_id = podObj?.id ?? null
    }
    if (Object.keys(patch).length > 0) onUpdate(zampian.id, patch)
    setEditing(false)
    setDraft({})
  }

  const role      = editing ? draft.role      : zampian.role
  const podName   = editing ? draft.pod_name  : (zampian.pod_name ?? '—')
  const isActive  = editing ? draft.is_active : zampian.is_active

  return (
    <tr className={`border-b border-border-subtle last:border-0 transition-colors ${editing ? 'bg-zamp-50/40' : 'hover:bg-surface-page/50'}`}>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-zamp-100 flex items-center justify-center text-xs font-bold text-zamp-700 flex-shrink-0">
            {zampian.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-800">{zampian.name}</div>
            <div className="text-xs text-gray-400">{zampian.email}</div>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="py-3 px-4">
        {editing ? (
          <select
            value={draft.role}
            onChange={e => setDraft(d => ({ ...d, role: e.target.value }))}
            className="text-xs border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-zamp-500/30"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        ) : (
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLOR[role] ?? 'bg-gray-100 text-gray-600'}`}>
            {role}
          </span>
        )}
      </td>

      {/* Pod */}
      <td className="py-3 px-4">
        {editing ? (
          <select
            value={draft.pod_name}
            onChange={e => setDraft(d => ({ ...d, pod_name: e.target.value }))}
            className="text-xs border border-border rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-zamp-500/30"
          >
            <option value="">— No pod —</option>
            {podOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : (
          <span className="text-sm text-gray-600">{podName}</span>
        )}
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        {editing ? (
          <button
            type="button"
            onClick={() => setDraft(d => ({ ...d, is_active: !d.is_active }))}
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full transition-colors ${draft.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            {draft.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {draft.is_active ? 'Active' : 'Inactive'}
          </button>
        ) : (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {isActive ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {isActive ? 'Active' : 'Inactive'}
          </span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-right">
        {isPending ? (
          <Spinner className="w-4 h-4 ml-auto" />
        ) : editing ? (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={cancelEdit}
              className="text-xs px-2.5 py-1 rounded-lg border border-border text-gray-500 hover:bg-surface-page transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="text-xs px-2.5 py-1 rounded-lg bg-zamp-600 text-white font-medium hover:bg-zamp-700 transition-colors"
            >
              Save
            </button>
          </div>
        ) : isSuperadmin ? (
          <button
            onClick={startEdit}
            className="text-xs px-2.5 py-1 rounded-lg border border-border text-gray-500 hover:bg-surface-page hover:text-gray-800 transition-colors"
          >
            Edit
          </button>
        ) : null}
      </td>
    </tr>
  )
}

// ── Request Change Modal ────────────────────────────────────────────────────

function RequestChangeModal({ zampian, pods, onClose }) {
  const [field, setField]       = useState('name')
  const [newValue, setNewValue] = useState('')
  const { mutate, isPending }   = useCreateProfileChangeRequest()

  // Map display field label → actual key on the zampian sub-object from /api/me
  const displayToZampianKey = { name: 'name', pod: 'pod_name', role: 'role', active: null }
  const oldValue = displayToZampianKey[field] ? (zampian?.[displayToZampianKey[field]] ?? '') : ''
  const podOptions = pods?.map(p => p.name) ?? []

  function handleSubmit(e) {
    e.preventDefault()
    if (!newValue || newValue === String(oldValue)) return
    // For pod: resolve name → id since backend stores pod_id as integer
    let resolvedValue = newValue
    if (field === 'pod') {
      const podObj = pods?.find(p => p.name === newValue)
      resolvedValue = podObj ? String(podObj.id) : newValue
    }
    // Map display field name to backend column name
    mutate(
      { field: FIELD_MAP[field], old_value: String(oldValue), new_value: resolvedValue },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 pt-6 pb-4 border-b border-border-subtle">
          <h2 className="text-base font-semibold text-gray-800">Request profile change</h2>
          <p className="text-xs text-gray-400 mt-0.5">A superadmin will review your request before it takes effect.</p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Field to change</label>
            <select
              value={field}
              onChange={e => { setField(e.target.value); setNewValue('') }}
              className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500/30"
            >
              {CHANGEABLE_FIELDS.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current value</label>
            <div className="text-sm text-gray-500 px-3 py-2 bg-surface-page rounded-lg border border-border">
              {String(oldValue) || '—'}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">New value</label>
            {field === 'role' ? (
              <select
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                required
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500/30"
              >
                <option value="">Select role…</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : field === 'pod' ? (
              <select
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                required
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500/30"
              >
                <option value="">Select pod…</option>
                {podOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            ) : field === 'active' ? (
              <select
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                required
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500/30"
              >
                <option value="">Select…</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            ) : (
              <input
                type="text"
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                required
                placeholder={`New ${field}…`}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500/30"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-surface-page transition-colors">Cancel</button>
            <button
              type="submit"
              disabled={isPending || !newValue || newValue === String(oldValue)}
              className="text-sm px-4 py-2 rounded-lg bg-zamp-600 text-white font-medium hover:bg-zamp-700 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── ProfileTab ──────────────────────────────────────────────────────────────

function ProfileTab({ pods }) {
  const { user } = useAuth()
  // Google profile fields live directly on user; RBAC fields are under user.zampian
  const z = user?.zampian ?? {}   // { id, name, email, role, pod, is_active, ... }
  const displayName = user?.name  // Google display name
  const email       = user?.email

  const [showModal, setShowModal] = useState(false)
  const { data: allRequests = [], isLoading } = useProfileChangeRequests()

  // Only requests for the current user (matched by zampian id)
  const myRequests = allRequests.filter(r => r.zampian_id === z.id)
  const pending    = myRequests.filter(r => r.status === 'pending')

  const statusIcon = {
    pending:  <Clock className="w-3.5 h-3.5 text-amber-500" />,
    approved: <CheckCheck className="w-3.5 h-3.5 text-green-600" />,
    rejected: <Ban className="w-3.5 h-3.5 text-red-500" />,
  }
  const statusColor = {
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Profile card */}
      <div className="card p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-zamp-100 flex items-center justify-center text-xl font-bold text-zamp-700">
              {displayName?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">{displayName}</h2>
              <p className="text-sm text-gray-400">{email}</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="text-sm px-4 py-2 rounded-lg bg-zamp-600 text-white font-medium hover:bg-zamp-700 transition-colors"
          >
            Request change
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {[
            { label: 'Role',   extra: <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${ROLE_COLOR[z.role] ?? 'bg-gray-100 text-gray-600'}`}>{z.role ?? '—'}</span> },
            { label: 'Pod',    extra: <span className="text-sm text-gray-700">{z.pod_name ?? '—'}</span> },
            { label: 'Status', extra: <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span> },
          ].map(({ label, extra }) => (
            <div key={label} className="bg-surface-page rounded-xl p-4 border border-border-subtle">
              <div className="text-xs font-medium text-gray-400 mb-1.5">{label}</div>
              {extra}
            </div>
          ))}
        </div>

        {pending.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              You have <strong>{pending.length}</strong> pending change request{pending.length > 1 ? 's' : ''} awaiting superadmin review.
            </p>
          </div>
        )}
      </div>

      {/* My requests history */}
      {myRequests.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h3 className="text-sm font-semibold text-gray-700">My change requests</h3>
          </div>
          {isLoading ? (
            <div className="py-8 flex justify-center"><Spinner /></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-page">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-4">Field</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-4">From</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-4">To</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-4">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-4">Reviewed by</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-2.5 px-4">Note</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.map(r => (
                  <tr key={r.id} className="border-b border-border-subtle last:border-0 hover:bg-surface-page/50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-700 capitalize">{r.field}</td>
                    <td className="py-3 px-4 text-sm text-gray-400 line-through">{r.old_value}</td>
                    <td className="py-3 px-4 text-sm text-gray-700">{r.new_value}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full border ${statusColor[r.status]}`}>
                        {statusIcon[r.status]}
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-400">{r.reviewer_name ?? r.reviewer_email ?? '—'}</td>
                    <td className="py-3 px-4 text-xs text-gray-400">{r.review_note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && <RequestChangeModal zampian={z} pods={pods} onClose={() => setShowModal(false)} />}
    </div>
  )
}

// ── ApprovalQueue (superadmin only) ────────────────────────────────────────

function ApprovalQueue() {
  const { data: requests = [], isLoading } = useProfileChangeRequests()
  const { mutate: review, isPending }      = useReviewProfileChangeRequest()
  const [noteModal, setNoteModal]          = useState(null) // { id, action }
  const [note, setNote]                    = useState('')

  const pending = requests.filter(r => r.status === 'pending')

  if (isLoading) return <div className="py-8 flex justify-center"><Spinner /></div>
  if (pending.length === 0) return (
    <div className="card py-10 text-center">
      <CheckCheck className="w-8 h-8 text-green-400 mx-auto mb-2" />
      <p className="text-sm text-gray-400 font-medium">All caught up — no pending requests.</p>
    </div>
  )

  function handleReview(id, status, reviewNote) {
    review({ id, status, review_note: reviewNote || null }, {
      onSuccess: () => { setNoteModal(null); setNote('') }
    })
  }

  return (
    <div className="space-y-3">
      {pending.map(r => (
        <div key={r.id} className="card p-4 flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-gray-800">{r.requester_name ?? r.zampian_id}</span>
              <span className="text-xs text-gray-400">wants to change</span>
              <span className="text-xs font-semibold text-gray-600 capitalize bg-gray-100 px-2 py-0.5 rounded-full">{r.field}</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-sm">
              <span className="text-gray-400 line-through">{r.old_value}</span>
              <span className="text-gray-400">→</span>
              <span className="font-medium text-gray-800">{r.new_value}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { setNoteModal({ id: r.id, action: 'rejected' }); setNote('') }}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-medium disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={() => handleReview(r.id, 'approved', null)}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
            >
              Approve
            </button>
          </div>
        </div>
      ))}

      {/* Rejection note modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-800">Rejection note (optional)</h3>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              placeholder="Explain why this request is being rejected…"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zamp-500/30 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setNoteModal(null)} className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-surface-page transition-colors">Cancel</button>
              <button
                onClick={() => handleReview(noteModal.id, 'rejected', note)}
                disabled={isPending}
                className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Rejecting…' : 'Confirm reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TeamTab ─────────────────────────────────────────────────────────────────

function TeamTab({ zampians, pods, isSuperadmin }) {
  const [search,      setSearch]      = useState('')
  const [filterRole,  setFilterRole]  = useState('all')
  const [filterActive,setFilterActive]= useState('active')
  const [refreshing,  setRefreshing]  = useState(false)
  const { mutate: updateZampian, isPending } = useUpdateZampian()
  const { refreshZampian } = useAuth()

  const filtered = zampians.filter(z => {
    const matchSearch = !search ||
      z.name?.toLowerCase().includes(search.toLowerCase()) ||
      z.email?.toLowerCase().includes(search.toLowerCase())
    const matchRole   = filterRole   === 'all' || z.role   === filterRole
    const matchActive = filterActive === 'all' ||
      (filterActive === 'active' ? z.is_active : !z.is_active)
    return matchSearch && matchRole && matchActive
  })

  const activeCount     = zampians.filter(z => z.is_active).length
  const inactiveCount   = zampians.filter(z => !z.is_active).length
  const superadminCount = zampians.filter(z => z.role === 'SUPERADMIN').length

  function handleUpdate(id, patch) {
    updateZampian({ id, ...patch })
  }

  async function handleRefreshSession() {
    setRefreshing(true)
    try { await refreshZampian?.() } finally { setRefreshing(false) }
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Team directory</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage roles, pods, and member status.</p>
        </div>
        <button
          onClick={handleRefreshSession}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-gray-500 hover:bg-surface-page hover:text-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh session'}
        </button>
      </div>

      {!isSuperadmin && (
        <div className="card border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <Shield className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-800">
              You can view the team directory, but only <strong>SUPERADMIN</strong> users can make changes.
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              If your role was recently updated, click <strong>Refresh session</strong> above.
            </p>
          </div>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card text-center py-4 border-t-4 border-t-zamp-400">
          <div className="text-2xl font-bold text-zamp-600">{zampians.length}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium flex items-center justify-center gap-1">
            <Users className="w-3 h-3" /> Total
          </div>
        </div>
        <div className="card text-center py-4 border-t-4 border-t-green-400">
          <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Active</div>
        </div>
        <div className="card text-center py-4 border-t-4 border-t-gray-300">
          <div className="text-2xl font-bold text-gray-500">{inactiveCount}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium">Inactive</div>
        </div>
        <div className="card text-center py-4 border-t-4 border-t-red-400">
          <div className="text-2xl font-bold text-red-600">{superadminCount}</div>
          <div className="text-xs text-gray-500 mt-1 font-medium flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Superadmins
          </div>
        </div>
      </div>

      {/* Pending requests queue (superadmin only) */}
      {isSuperadmin && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Pending profile change requests
          </h3>
          <ApprovalQueue />
        </div>
      )}

      {/* Team table */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-subtle flex-wrap">
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-zamp-500/30"
          />
          <select
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-zamp-500/30 bg-white"
          >
            <option value="all">All roles</option>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            value={filterActive}
            onChange={e => setFilterActive(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-zamp-500/30 bg-white"
          >
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
            <option value="all">All members</option>
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} members</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No members match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-page">
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-4">Member</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-4">Role</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-4">Pod</th>
                  <th className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide py-3 px-4">Status</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(z => (
                  <ZampianRow
                    key={z.id}
                    zampian={z}
                    pods={pods}
                    onUpdate={handleUpdate}
                    isPending={isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Settings page ──────────────────────────────────────────────────────

export default function Settings() {
  const { user, role }                        = useAuth()
  const isSuperadmin                          = role === 'SUPERADMIN'
  const [tab, setTab]                         = useState('profile')
  const { data: zampians = [], isLoading: loadingZ } = useZampians()
  const { data: pods     = [], isLoading: loadingP } = usePodsList()

  const TABS = [
    { id: 'profile', label: 'Profile',      icon: User },
    { id: 'team',    label: 'Team',         icon: Users },
  ]

  if (loadingZ || loadingP) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-64">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your profile and your team.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border-subtle">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 border-b-2 transition-colors -mb-px ${
              tab === id
                ? 'border-zamp-600 text-zamp-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profile' && <ProfileTab pods={pods} />}
      {tab === 'team'    && <TeamTab zampians={zampians} pods={pods} isSuperadmin={isSuperadmin} />}
    </div>
  )
}
