import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'https://zamp-crm-api-production.up.railway.app/api'

const http = axios.create({ baseURL: BASE, timeout: 15000 })

// Inject x-zampian-email on every request so the backend RBAC middleware
// can resolve the caller's role without a separate auth token.
http.interceptors.request.use((config) => {
  try {
    const stored = localStorage.getItem('zamp_crm_user')
    if (stored) {
      const user = JSON.parse(stored)
      if (user?.email) config.headers['x-zampian-email'] = user.email
    }
  } catch { /* ignore */ }
  return config
})

http.interceptors.response.use(
  r => r.data,
  e => Promise.reject(e?.response?.data?.error || e.message)
)

export const api = {
  // Core entities
  clients:    (params = {}) => http.get('/clients', { params }),
  client:     (id)          => http.get(`/clients/${id}`),
  updateClient:  (id, body)  => http.patch(`/clients/${id}`, body),
  createClient:  (body)      => http.post('/clients', body),

  pods:        ()           => http.get('/pods'),
  createPod:   (body)       => http.post('/pods', body),
  updatePod:   (id, body)   => http.patch(`/pods/${id}`, body),
  podClients:  (id)         => http.get(`/pods/${id}/clients`),

  zampians:      ()           => http.get('/zampians'),
  updateZampian: (id, body)  => http.patch(`/zampians/${id}`, body),
  podsList:      ()           => http.get('/pods/list'),
  zampianClients: (id, role) => http.get(`/zampians/${id}/clients`, { params: { role } }),

  // Tasks
  tasks:       (params = {}) => http.get('/tasks', { params }),
  task:        (id)          => http.get(`/tasks/${id}`),
  taskHistory: (id)          => http.get(`/tasks/${id}/history`),
  createTask:  (body)        => http.post('/tasks', body),
  updateTask:  (id, body)    => http.patch(`/tasks/${id}`, body),

  // Milestones
  milestones:      (clientId)   => http.get('/milestones', { params: { client_id: clientId } }),
  createMilestone: (body)       => http.post('/milestones', body),
  updateMilestone: (id, body)   => http.patch(`/milestones/${id}`, body),

  // Asks
  asks:       (params = {}) => http.get('/asks', { params }),
  createAsk:  (body)        => http.post('/asks', body),
  updateAsk:  (id, body)    => http.patch(`/asks/${id}`, body),

  // Meetings
  meetings:        (clientId)    => http.get('/meetings', { params: { client_id: clientId } }),
  meeting:         (id)          => http.get(`/meetings/${id}`),
  createMeeting:   (body)        => http.post('/meetings', body),

  // Stakeholders
  stakeholders:    (clientId)    => http.get('/stakeholders', { params: { client_id: clientId } }),
  createStakeholder: (body)      => http.post('/stakeholders', body),
  updateStakeholder: (id, body)  => http.patch(`/stakeholders/${id}`, body),
  deleteStakeholder: (id)        => http.delete(`/stakeholders/${id}`),

  // Commitments
  commitments:     (params = {}) => http.get('/commitments', { params }),
  createCommitment:(body)        => http.post('/commitments', body),
  updateCommitment:(id, body)    => http.patch(`/commitments/${id}`, body),

  // Signals
  signals:         (params = {}) => http.get('/signals', { params }),
  createSignal:    (body)        => http.post('/signals', body),
  updateSignal:    (id, body)    => http.patch(`/signals/${id}`, body),

  // Snapshots (progress tracking)
  snapshots:      (clientId)    => http.get(`/clients/${clientId}/snapshots`),
  createSnapshot: (clientId, body) => http.post(`/clients/${clientId}/snapshots`, body),

  // Health
  health:     ()            => http.get('/health'),

  // Identity / RBAC
  me:         (email)       => http.get('/me', { headers: { 'x-zampian-email': email } }),

  // Approvals
  approvals:        ()              => http.get('/approvals'),
  resolveApproval:  (id, body)      => http.post(`/approvals/${id}/resolve`, body),

  // Profile change requests
  profileChangeRequests:       ()           => http.get('/profile-change-requests'),
  createProfileChangeRequest:  (body)       => http.post('/profile-change-requests', body),
  reviewProfileChangeRequest:  (id, body)   => http.patch(`/profile-change-requests/${id}`, body),
  // Revenue — actual invoiced / collected tracking
  revenueSummary:  (params = {})     => http.get('/revenue/summary', { params }),
  revenueMonthly:  ()                => http.get('/revenue/monthly'),
  revenueByClient: (clientId)        => http.get(`/revenue/${clientId}`),
  revenueList:     (params = {})     => http.get('/revenue', { params }),
  upsertRevenue:   (body)            => http.post('/revenue', body),
  deleteRevenue:   (id)              => http.delete(`/revenue/${id}`),

  // Notifications
  notifications:   (params = {})    => http.get('/notifications', { params }),
  markRead:        (id)             => http.patch(`/notifications/${id}/read`),
  markAllRead:     ()               => http.patch('/notifications/read-all'),

  // Pod Transfers
  podTransfers:         ()              => http.get('/pod-transfers'),
  podTransfersCount:    ()              => http.get('/pod-transfers/count'),
  createPodTransfer:    (body)          => http.post('/pod-transfers', body),
  resolvePodTransfer:   (id, body)      => http.patch(`/pod-transfers/${id}`, body),

  // Ask Pace — LLM-backed chat over pod-scoped CRM data
  chat:            (body)            => http.post('/chat', body),

  // POCs
  addPoc:    (clientId, email)       => http.post(`/clients/${clientId}/pocs`, { email }),
  removePoc: (clientId, zampianId)   => http.delete(`/clients/${clientId}/pocs/${zampianId}`),

  // Processes
  processes:       (clientId)             => http.get(`/clients/${clientId}/processes`),
  process:         (clientId, processId)  => http.get(`/clients/${clientId}/processes/${processId}`),
  createProcess:   (clientId, body)       => http.post(`/clients/${clientId}/processes`, body),
  updateProcess:   (clientId, processId, body) => http.patch(`/clients/${clientId}/processes/${processId}`, body),
  deleteProcess:   (clientId, processId)  => http.delete(`/clients/${clientId}/processes/${processId}`),

  // Process sub-resources
  addUpdate:    (clientId, processId, body)  => http.post(`/clients/${clientId}/processes/${processId}/updates`, body),
  addActionItem:(clientId, processId, body)  => http.post(`/clients/${clientId}/processes/${processId}/action-items`, body),
  toggleActionItem:(clientId, processId, id, newStatus) => http.patch(`/clients/${clientId}/processes/${processId}/action_items/${id}`, { status: newStatus }),
  addBlocker:   (clientId, processId, body)  => http.post(`/clients/${clientId}/processes/${processId}/blockers`, body),
  resolveBlocker:(clientId, processId, id)   => http.post(`/clients/${clientId}/processes/${processId}/blockers/${id}/resolve`),

  // Comments
  comments:        (processId)                    => http.get(`/processes/${processId}/comments`),
  addComment:      (processId, body)              => http.post(`/processes/${processId}/comments`, body),
  deleteComment:   (processId, commentId)         => http.delete(`/processes/${processId}/comments/${commentId}`),
  addReaction:     (processId, commentId, emoji)  => http.post(`/processes/${processId}/comments/${commentId}/reactions`, { emoji }),
  removeReaction:  (processId, commentId, emoji)  => http.delete(`/processes/${processId}/comments/${commentId}/reactions/${emoji}`),

  // Outreach module (Pod 4 + SUPERADMIN + CEO only)
  outreachWorkstreams: ()                  => http.get('/outreach/workstreams'),
  outreachJobs:        ()                  => http.get('/outreach/jobs'),
  outreachJob:         (jobId)             => http.get(`/outreach/jobs/${jobId}`),
  createOutreachJob:   (body)              => http.post('/outreach/jobs', body),
  editOutreachCsv:     (jobId, csv_data)   => http.patch(`/outreach/jobs/${jobId}/csv`, { csv_data }),
  deployOutreachJob:   (jobId, body)       => http.post(`/outreach/jobs/${jobId}/deploy`, body),
  cancelOutreachJob:   (jobId)             => http.post(`/outreach/jobs/${jobId}/cancel`),
}

// Edit/delete methods for updates, action items, blockers
// NOTE: use `http` (the axios instance), NOT `api` (a plain object with no .patch/.delete)
export const updateUpdate = (clientId, processId, updateId, data) =>
  http.patch(`/clients/${clientId}/processes/${processId}/updates/${updateId}`, data)

export const deleteUpdate = (clientId, processId, updateId) =>
  http.delete(`/clients/${clientId}/processes/${processId}/updates/${updateId}`)

export const updateActionItem = (clientId, processId, actionItemId, data) =>
  http.patch(`/clients/${clientId}/processes/${processId}/action_items/${actionItemId}`, data)

export const deleteActionItem = (clientId, processId, actionItemId) =>
  http.delete(`/clients/${clientId}/processes/${processId}/action_items/${actionItemId}`)

export const updateBlocker = (clientId, processId, blockerId, data) =>
  http.patch(`/clients/${clientId}/processes/${processId}/blockers/${blockerId}`, data)

export const deleteBlocker = (clientId, processId, blockerId) =>
  http.delete(`/clients/${clientId}/processes/${processId}/blockers/${blockerId}`)
