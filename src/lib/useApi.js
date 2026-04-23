import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from './api'

// ─── Clients ────────────────────────────────────────────────────────────────
export function useClients(params = {}) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => api.clients(params),
    staleTime: 30_000,
  })
}

export function useClient(id) {
  return useQuery({
    queryKey: ['client', id],
    queryFn: () => api.client(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateClient(id, body),
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['clients'] })
      await qc.cancelQueries({ queryKey: ['client', String(id)] })
      const previousList   = qc.getQueryData(['clients'])
      const previousSingle = qc.getQueryData(['client', String(id)])
      qc.setQueryData(['clients'], (old = []) =>
        old.map(c => c.id === id ? { ...c, ...updates } : c)
      )
      qc.setQueryData(['client', String(id)], (old) =>
        old ? { ...old, ...updates } : old
      )
      return { previousList, previousSingle, id }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.setQueryData(['client', String(data.id)], data)
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList)   qc.setQueryData(['clients'], context.previousList)
      if (context?.previousSingle) qc.setQueryData(['client', String(context.id)], context.previousSingle)
      toast.error('Failed to update client. Changes have been reverted.')
    },
  })
}

// ─── Pods ────────────────────────────────────────────────────────────────────
export function usePods() {
  return useQuery({
    queryKey: ['pods'],
    queryFn: api.pods,
    staleTime: 60_000,
    // Pods with multiple GM/ASM members fan-out into multiple rows (one per GM×ASM
    // combination). Deduplicate by pod id, keeping the first row's gm/asm names.
    select: (rows) => {
      const seen = new Map()
      for (const row of rows) {
        if (!seen.has(row.id)) seen.set(row.id, row)
      }
      return Array.from(seen.values())
    },
  })
}

export function useCreatePod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.createPod(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pods'] }),
  })
}

export function useUpdatePod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updatePod(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pods'] }),
  })
}

// ─── Zampians ────────────────────────────────────────────────────────────────
export function usePodClients(podId) {
  return useQuery({
    queryKey: ['podClients', podId],
    queryFn: () => api.podClients(podId),
    enabled: !!podId,
    staleTime: 30_000,
  })
}

export function useZampians() {
  return useQuery({
    queryKey: ['zampians'],
    queryFn: api.zampians,
    staleTime: 60_000,
  })
}

export function useUpdateZampian() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }) => api.updateZampian(id, updates),
    // Optimistic update — reflect change instantly in the UI
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['zampians'] })
      const previous = qc.getQueryData(['zampians'])
      qc.setQueryData(['zampians'], (old = []) =>
        old.map(z => z.id === id ? { ...z, ...updates } : z)
      )
      return { previous }
    },
    // On success, refetch to get the server's response (e.g. pod_name resolved)
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zampians'] }),
    // On error, roll back to the previous data
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueryData(['zampians'], context.previous)
      toast.error('Failed to update team member. Changes have been reverted.')
    },
  })
}

export function usePodsList() {
  return useQuery({
    queryKey: ['pods-list'],  // fetches /api/pods/list
    queryFn: api.podsList,
    staleTime: 300_000,
  })
}

// ─── Tasks ───────────────────────────────────────────────────────────────────
export function useTasks(params = {}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: () => api.tasks(params),
    staleTime: 20_000,
  })
}

export function useTask(id) {
  return useQuery({
    queryKey: ['task', id],
    queryFn: () => api.task(id),
    enabled: !!id,
    staleTime: 10_000,
  })
}

export function useTaskHistory(id) {
  return useQuery({
    queryKey: ['taskHistory', id],
    queryFn: () => api.taskHistory(id),
    enabled: !!id,
    staleTime: 10_000,
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateTask(id, body),
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] })
      const previous = qc.getQueryData(['tasks'])
      // Optimistically update every tasks query (any param set)
      qc.setQueriesData({ queryKey: ['tasks'] }, (old = []) =>
        Array.isArray(old) ? old.map(t => t.id === id ? { ...t, ...updates } : t) : old
      )
      qc.setQueryData(['task', String(id)], (old) =>
        old ? { ...old, ...updates } : old
      )
      return { previous, id }
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['task', String(data.id)] })
      qc.invalidateQueries({ queryKey: ['taskHistory', String(data.id)] })
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueriesData({ queryKey: ['tasks'] }, context.previous)
      toast.error('Failed to update task. Changes have been reverted.')
    },
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.createTask(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })
}

// ─── Milestones ───────────────────────────────────────────────────────────────
export function useMilestones(clientId) {
  return useQuery({
    queryKey: ['milestones', clientId],
    queryFn: () => api.milestones(clientId),
    enabled: !!clientId,
    staleTime: 30_000,
  })
}

// ─── Asks ─────────────────────────────────────────────────────────────────────
export function useAsks(params = {}) {
  return useQuery({
    queryKey: ['asks', params],
    queryFn: () => api.asks(params),
    staleTime: 20_000,
  })
}

export function useCreateAsk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.createAsk(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asks'] }),
  })
}

export function useUpdateAsk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateAsk(id, body),
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['asks'] })
      const previous = qc.getQueryData(['asks'])
      qc.setQueriesData({ queryKey: ['asks'] }, (old = []) =>
        Array.isArray(old) ? old.map(a => a.id === id ? { ...a, ...updates } : a) : old
      )
      return { previous }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['asks'] }),
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueriesData({ queryKey: ['asks'] }, context.previous)
      toast.error('Failed to update open ask. Changes have been reverted.')
    },
  })
}

// ─── Meetings ────────────────────────────────────────────────────────────────
export function useMeetings(clientId) {
  return useQuery({
    queryKey: ['meetings', clientId],
    queryFn: () => api.meetings(clientId),
    enabled: !!clientId,
    staleTime: 30_000,
  })
}

export function useMeeting(id) {
  return useQuery({
    queryKey: ['meeting', id],
    queryFn: () => api.meeting(id),
    enabled: !!id,
    staleTime: 60_000,
  })
}

// ─── Stakeholders ─────────────────────────────────────────────────────────────
export function useStakeholders(clientId) {
  return useQuery({
    queryKey: ['stakeholders', clientId],
    queryFn: () => api.stakeholders(clientId),
    enabled: !!clientId,
    staleTime: 30_000,
  })
}

// ─── Commitments ──────────────────────────────────────────────────────────────
export function useCommitments(params = {}) {
  return useQuery({
    queryKey: ['commitments', params],
    queryFn: () => api.commitments(params),
    staleTime: 20_000,
  })
}

export function useUpdateCommitment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateCommitment(id, body),
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['commitments'] })
      const previous = qc.getQueryData(['commitments'])
      qc.setQueriesData({ queryKey: ['commitments'] }, (old = []) =>
        Array.isArray(old) ? old.map(c => c.id === id ? { ...c, ...updates } : c) : old
      )
      return { previous }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commitments'] }),
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueriesData({ queryKey: ['commitments'] }, context.previous)
      toast.error('Failed to update commitment. Changes have been reverted.')
    },
  })
}

// ─── Signals ──────────────────────────────────────────────────────────────────
export function useSignals(params = {}) {
  return useQuery({
    queryKey: ['signals', params],
    queryFn: () => api.signals(params),
    staleTime: 20_000,
  })
}

export function useUpdateSignal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }) => api.updateSignal(id, body),
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ['signals'] })
      const previous = qc.getQueryData(['signals'])
      qc.setQueriesData({ queryKey: ['signals'] }, (old = []) =>
        Array.isArray(old) ? old.map(s => s.id === id ? { ...s, ...updates } : s) : old
      )
      return { previous }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['signals'] }),
    onError: (_err, _vars, context) => {
      if (context?.previous) qc.setQueriesData({ queryKey: ['signals'] }, context.previous)
      toast.error('Failed to update signal. Changes have been reverted.')
    },
  })
}


// ─── Snapshots ───────────────────────────────────────────────────────────────
export function useSnapshots(clientId) {
  return useQuery({
    queryKey: ['snapshots', clientId],
    queryFn: () => api.snapshots(clientId),
    enabled: !!clientId,
    staleTime: 60_000,
  })
}

// ─── Approvals ───────────────────────────────────────────────────────────────
export function useApprovals() {
  return useQuery({
    queryKey: ['approvals'],
    queryFn: api.approvals,
    staleTime: 15_000,
    refetchInterval: 30_000, // poll every 30s so new requests appear automatically
  })
}

export function useResolveApproval() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, decision, note }) => api.resolveApproval(id, { decision, note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

// ─── Derived: dashboard summary ──────────────────────────────────────────────

export function useDashboardSummary(podId = null) {
  const { data: allClients = [], isLoading: cLoading } = useClients()
  const { data: allTasks = [],   isLoading: tLoading } = useTasks()

  // Apply pod filter when in pod view
  const clients = podId
    ? allClients.filter(c => String(c.pod_id) === String(podId))
    : allClients

  const clientIds = new Set(clients.map(c => c.id))
  const tasks = podId
    ? allTasks.filter(t => t.client_id && clientIds.has(t.client_id))
    : allTasks

  const summary = {
    total_clients:  clients.length,
    live_clients:   clients.filter(c => c.stage === 'live').length,
    total_arr:      clients.reduce((s, c) => s + (Number(c.arr) || 0), 0),
    health_green:   clients.filter(c => c.health === 'green').length,
    health_yellow:  clients.filter(c => c.health === 'yellow').length,
    health_red:     clients.filter(c => c.health === 'red').length,
    open_tasks:     tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled').length,
    overdue_tasks:  tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length,
    open_signals:   0,
  }

  return { summary, clients, tasks, allClients, isLoading: cLoading || tLoading }
}

// ─── Profile Change Requests ──────────────────────────────────────────────────

export function useProfileChangeRequests() {
  return useQuery({
    queryKey: ['profileChangeRequests'],
    queryFn: api.profileChangeRequests,
    staleTime: 30_000,
  })
}

export function useCreateProfileChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.createProfileChangeRequest(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profileChangeRequests'] })
      toast.success('Change request submitted. A superadmin will review it shortly.')
    },
    onError: () => toast.error('Failed to submit change request.'),
  })
}

export function useReviewProfileChangeRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, review_note }) =>
      api.reviewProfileChangeRequest(id, { status, review_note }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['profileChangeRequests'] })
      qc.invalidateQueries({ queryKey: ['zampians'] })
      toast.success(`Request ${data.status}.`)
    },
    onError: () => toast.error('Failed to review request.'),
  })
}

// ─── Revenue ─────────────────────────────────────────────────────────────────
export function useRevenueSummary(months) {
  return useQuery({
    queryKey: ['revenueSummary', months],
    queryFn: () => api.revenueSummary(months ? { months } : {}),
    staleTime: 60_000,
  })
}

export function useRevenueMonthly() {
  return useQuery({
    queryKey: ['revenueMonthly'],
    queryFn: () => api.revenueMonthly(),
    staleTime: 60_000,
  })
}

export function useRevenueList(months) {
  return useQuery({
    queryKey: ['revenueList', months],
    queryFn: () => api.revenueList(months ? { months } : {}),
    staleTime: 60_000,
  })
}

export function useRevenueByClient(clientId) {
  return useQuery({
    queryKey: ['revenueByClient', clientId],
    queryFn: () => api.revenueByClient(clientId),
    enabled: !!clientId,
    staleTime: 30_000,
  })
}

export function useUpsertRevenue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.upsertRevenue(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenueSummary'] })
      qc.invalidateQueries({ queryKey: ['revenueMonthly'] })
      qc.invalidateQueries({ queryKey: ['revenueByClient'] })
      qc.invalidateQueries({ queryKey: ['revenueList'] })
      toast.success('Revenue record saved.')
    },
    onError: (e) => toast.error(e || 'Failed to save revenue record.'),
  })
}

export function useDeleteRevenue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.deleteRevenue(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['revenueSummary'] })
      qc.invalidateQueries({ queryKey: ['revenueMonthly'] })
      qc.invalidateQueries({ queryKey: ['revenueByClient'] })
      qc.invalidateQueries({ queryKey: ['revenueList'] })
      toast.success('Revenue record deleted.')
    },
    onError: () => toast.error('Failed to delete revenue record.'),
  })
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.notifications(),
    staleTime: 30_000,
    refetchInterval: 60_000, // poll every 60s for new notifications
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

// ─── Pod Transfers ────────────────────────────────────────────────────────────

export function usePodTransfers() {
  return useQuery({
    queryKey: ['pod-transfers'],
    queryFn: api.podTransfers,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function usePodTransfersCount() {
  return useQuery({
    queryKey: ['pod-transfers-count'],
    queryFn: api.podTransfersCount,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useCreatePodTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => api.createPodTransfer(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pod-transfers'] })
      qc.invalidateQueries({ queryKey: ['pod-transfers-count'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('Transfer request sent. The receiving pod GM will be notified.')
    },
    onError: (e) => toast.error(e || 'Failed to submit transfer request.'),
  })
}

export function useResolvePodTransfer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, reviewer_note }) => api.resolvePodTransfer(id, { status, reviewer_note }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['pod-transfers'] })
      qc.invalidateQueries({ queryKey: ['pod-transfers-count'] })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
      toast.success(data.status === 'approved' ? 'Transfer approved. Client has been moved.' : 'Transfer rejected.')
    },
    onError: (e) => toast.error(e || 'Failed to resolve transfer.'),
  })
}
