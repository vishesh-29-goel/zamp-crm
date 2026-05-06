import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Send, Plus, Trash2, Download, Upload, ArrowRight, Loader2,
  CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw, Mail, ExternalLink,
} from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import Spinner from '../components/Spinner'

const SENDERS = [
  { id: 'Amit Jain',  label: 'Amit Jain (CEO)' },
  { id: 'Pulak',      label: 'Pulak (Head of Sales)' },
  { id: 'Chirag',     label: 'Chirag (Head of Sales)' },
  { id: 'Umashankar', label: 'Umashankar (Head of Sales)' },
]

const STAGE_LABEL = {
  pending_csv:     { label: 'Generating CSV', icon: Loader2, color: 'text-amber-600 bg-amber-50' },
  generating_csv:  { label: 'Generating CSV', icon: Loader2, color: 'text-amber-600 bg-amber-50' },
  csv_ready:       { label: 'Review CSV',     icon: AlertCircle, color: 'text-blue-600 bg-blue-50' },
  pending_deploy:  { label: 'Deploying',      icon: Loader2, color: 'text-amber-600 bg-amber-50' },
  deploying:       { label: 'Deploying',      icon: Loader2, color: 'text-amber-600 bg-amber-50' },
  completed:       { label: 'Completed',      icon: CheckCircle2, color: 'text-green-600 bg-green-50' },
  failed:          { label: 'Failed',         icon: XCircle, color: 'text-red-600 bg-red-50' },
  canceled:        { label: 'Canceled',       icon: XCircle, color: 'text-gray-500 bg-gray-100' },
}

// ─── Root component ───────────────────────────────────────────────────────
export default function Outreach() {
  const { jobId } = useParams()
  if (jobId) return <JobDetail jobId={jobId} />
  return <JobList />
}

// ─── View 1: Jobs list + "New job" button ─────────────────────────────────
function JobList() {
  const nav = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['outreachJobs'],
    queryFn: api.outreachJobs,
    refetchInterval: 15_000,
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
          <p className="text-sm text-gray-500 mt-1">Find prospects, personalize landing pages, draft emails — all in one pass.</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-zamp-600 text-white rounded-lg text-sm font-medium hover:bg-zamp-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> New outreach job
        </button>
      </div>

      {showNew && <NewJobForm onClose={() => setShowNew(false)} onCreated={(j) => nav(`/outreach/${j.job_id}`)} />}

      {isLoading ? <Spinner /> : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {jobs.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">
              No outreach jobs yet. Click "New outreach job" to start.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Started</th>
                  <th className="text-left px-4 py-3 font-medium">By</th>
                  <th className="text-left px-4 py-3 font-medium">Companies</th>
                  <th className="text-left px-4 py-3 font-medium">Prospects</th>
                  <th className="text-left px-4 py-3 font-medium">Pages</th>
                  <th className="text-left px-4 py-3 font-medium">Drafts</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {jobs.map(j => {
                  const stageInfo = STAGE_LABEL[j.stage] || { label: j.stage, icon: Clock, color: 'text-gray-500 bg-gray-50' }
                  const Icon = stageInfo.icon
                  const animate = ['pending_csv','generating_csv','pending_deploy','deploying'].includes(j.stage)
                  const companies = Array.isArray(j.companies_input) ? j.companies_input : []
                  return (
                    <tr key={j.job_id} onClick={() => nav(`/outreach/${j.job_id}`)} className="cursor-pointer hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{new Date(j.started_at).toLocaleDateString()} {new Date(j.started_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</td>
                      <td className="px-4 py-3 text-gray-700">{j.initiated_by_name}</td>
                      <td className="px-4 py-3 text-gray-900">{companies.length}</td>
                      <td className="px-4 py-3 text-gray-900">{j.total_prospects}</td>
                      <td className="px-4 py-3 text-gray-900">{j.pages_deployed}</td>
                      <td className="px-4 py-3 text-gray-900">{j.drafts_created}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${stageInfo.color}`}>
                          <Icon className={`w-3 h-3 ${animate ? 'animate-spin' : ''}`} />
                          {stageInfo.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

// ─── View 2: New job form — add companies + headcount + workstream ───────
function NewJobForm({ onClose, onCreated }) {
  const [rows, setRows] = useState([{ company: '', headcount: 5, workstream_id: '' }])
  const { data: workstreams = [] } = useQuery({
    queryKey: ['workstreams'],
    queryFn: api.outreachWorkstreams,
    staleTime: Infinity,
  })

  // Group workstreams by industry for the dropdown
  const grouped = useMemo(() => {
    const g = {}
    for (const w of workstreams) {
      const key = `${w.industry === 'banking' ? 'Banking' : 'Pharma'} — ${w.group}`
      ;(g[key] = g[key] || []).push(w)
    }
    return g
  }, [workstreams])

  const createJob = useMutation({
    mutationFn: api.createOutreachJob,
    onSuccess: (j) => {
      toast.success('Outreach job queued — generating CSV...')
      onCreated(j)
    },
    onError: (e) => toast.error(String(e)),
  })

  const update = (i, k, v) => setRows(rs => rs.map((r, ix) => ix === i ? { ...r, [k]: v } : r))
  const addRow = () => setRows(rs => [...rs, { company: '', headcount: 5, workstream_id: '' }])
  const removeRow = (i) => setRows(rs => rs.filter((_, ix) => ix !== i))

  const handleSubmit = () => {
    const filled = rows.filter(r => r.company.trim() && r.workstream_id)
    if (filled.length === 0) return toast.error('Add at least one company with a workstream')
    createJob.mutate({ companies: filled, workstream_mode: 'per_row' })
  }

  return (
    <div className="bg-white border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">New outreach job</h2>
        <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600">Cancel</button>
      </div>
      <p className="text-sm text-gray-500 mb-4">Add companies, how many decision-makers per company, and which workstream to source for.</p>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm"
              placeholder="Company name (e.g. HSBC)"
              value={r.company}
              onChange={(e) => update(i, 'company', e.target.value)}
            />
            <input
              type="number"
              min={1}
              max={20}
              className="w-20 px-3 py-2 border border-border rounded-lg text-sm"
              value={r.headcount}
              onChange={(e) => update(i, 'headcount', parseInt(e.target.value) || 1)}
            />
            <select
              className="flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-white"
              value={r.workstream_id}
              onChange={(e) => update(i, 'workstream_id', e.target.value)}
            >
              <option value="">— Select workstream —</option>
              {Object.entries(grouped).map(([g, items]) => (
                <optgroup key={g} label={g}>
                  {items.map(w => <option key={w.id} value={w.id}>{w.label}</option>)}
                </optgroup>
              ))}
            </select>
            {rows.length > 1 && (
              <button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500 p-2">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={addRow} className="mt-3 text-sm text-zamp-600 font-medium flex items-center gap-1 hover:text-zamp-700">
        <Plus className="w-3.5 h-3.5" /> Add another company
      </button>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
        <button
          onClick={handleSubmit}
          disabled={createJob.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-zamp-600 text-white rounded-lg text-sm font-medium hover:bg-zamp-700 disabled:opacity-50"
        >
          {createJob.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Continue
        </button>
      </div>
    </div>
  )
}

// ─── View 3: Job detail — polls, shows CSV or progress ───────────────────
function JobDetail({ jobId }) {
  const qc = useQueryClient()
  const { data: job, isLoading } = useQuery({
    queryKey: ['outreachJob', jobId],
    queryFn: () => api.outreachJob(jobId),
    // Poll every 5s when job is in an active stage
    refetchInterval: (q) => {
      const s = q.state.data?.stage
      if (['csv_ready','completed','failed','canceled'].includes(s)) return false
      return 5_000
    },
  })

  if (isLoading || !job) return <div className="p-8"><Spinner /></div>

  const stageInfo = STAGE_LABEL[job.stage] || { label: job.stage, icon: Clock, color: 'text-gray-500 bg-gray-50' }
  const Icon = stageInfo.icon
  const spinning = ['pending_csv','generating_csv','pending_deploy','deploying'].includes(job.stage)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link to="/outreach" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">← Back to all jobs</Link>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach job</h1>
          <p className="text-sm text-gray-500 mt-1">Started by {job.initiated_by_name} · {new Date(job.started_at).toLocaleString()}</p>
        </div>
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${stageInfo.color}`}>
          <Icon className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
          {stageInfo.label}
        </span>
      </div>

      {job.error_message && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-sm text-red-700">
          <div className="font-semibold mb-1">Job failed</div>
          {job.error_message}
        </div>
      )}

      {/* Input summary — always visible */}
      <InputSummary job={job} />

      {/* Stage-specific UI */}
      {['pending_csv','generating_csv'].includes(job.stage) && <WaitingPanel label="Finding prospects..." />}
      {job.stage === 'csv_ready' && <CsvReviewPanel job={job} />}
      {['pending_deploy','deploying','completed','failed'].includes(job.stage) && <DeployProgressPanel job={job} />}

      {/* Event log */}
      <EventLog events={job.events || []} />
    </div>
  )
}

function InputSummary({ job }) {
  const companies = Array.isArray(job.companies_input) ? job.companies_input : []
  return (
    <div className="bg-white border border-border rounded-xl p-4 mb-6">
      <div className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2">Input</div>
      <div className="flex flex-wrap gap-2">
        {companies.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md text-xs text-gray-700">
            <span className="font-semibold">{c.company}</span>
            <span className="text-gray-400">·</span>
            <span>{c.headcount} people</span>
            <span className="text-gray-400">·</span>
            <span className="text-zamp-600">{c.workstream_id}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function WaitingPanel({ label }) {
  return (
    <div className="bg-white border border-border rounded-xl p-8 mb-6 flex items-center justify-center gap-3 text-sm text-gray-600">
      <Loader2 className="w-5 h-5 animate-spin text-zamp-600" />
      <span>{label} This can take a few minutes.</span>
    </div>
  )
}

// ─── CSV review panel — edit/delete rows + pick sender + deploy ──────────
function CsvReviewPanel({ job }) {
  const qc = useQueryClient()
  const [rows, setRows] = useState(Array.isArray(job.csv_data) ? job.csv_data : [])
  const [sender, setSender] = useState('Amit Jain')
  const [gmailConnectionId, setGmailConnectionId] = useState('14b02628-1793-4ff6-ab9d-78f9dc0f5473')
  const [runMode, setRunMode] = useState('bulk')
  const { user } = useAuth()

  const saveEdits = useMutation({
    mutationFn: () => api.editOutreachCsv(job.job_id, rows),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outreachJob', job.job_id] }); toast.success('CSV saved') },
    onError: (e) => toast.error(String(e)),
  })

  const deploy = useMutation({
    mutationFn: () => api.deployOutreachJob(job.job_id, { sender, gmail_connection_id: gmailConnectionId, run_mode: runMode }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['outreachJob', job.job_id] }); toast.success('Deploy started') },
    onError: (e) => toast.error(String(e)),
  })

  const updateCell = (i, k, v) => setRows(rs => rs.map((r, ix) => ix === i ? { ...r, [k]: v } : r))
  const removeRow = (i) => setRows(rs => rs.filter((_, ix) => ix !== i))

  const downloadCsv = () => {
    const cols = ['name','title','company','linkedin_url','email','workstreams','llm_score']
    const csv = [cols.join(',')].concat(
      rows.map(r => cols.map(c => {
        const v = (r[c] ?? '').toString().replace(/"/g, '""')
        return v.includes(',') || v.includes('"') ? `"${v}"` : v
      }).join(','))
    ).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `outreach-${job.job_id.slice(0,8)}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Review prospects ({rows.length})</h2>
          <p className="text-sm text-gray-500 mt-0.5">Edit or delete any rows before deploying.</p>
        </div>
        <button onClick={downloadCsv} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 border border-border rounded-lg hover:bg-gray-50">
          <Download className="w-4 h-4" /> Download CSV
        </button>
      </div>

      <div className="overflow-x-auto border border-border rounded-lg mb-4 max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-3 py-2">Name</th>
              <th className="text-left px-3 py-2">Title</th>
              <th className="text-left px-3 py-2">Company</th>
              <th className="text-left px-3 py-2">Email</th>
              <th className="text-left px-3 py-2">LinkedIn</th>
              <th className="text-left px-3 py-2">Score</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="px-2 py-1"><input className="w-full px-2 py-1 text-sm border-transparent focus:border-border rounded" value={r.name || ''} onChange={e => updateCell(i, 'name', e.target.value)} /></td>
                <td className="px-2 py-1"><input className="w-full px-2 py-1 text-sm border-transparent focus:border-border rounded" value={r.title || ''} onChange={e => updateCell(i, 'title', e.target.value)} /></td>
                <td className="px-2 py-1"><input className="w-full px-2 py-1 text-sm border-transparent focus:border-border rounded" value={r.company || ''} onChange={e => updateCell(i, 'company', e.target.value)} /></td>
                <td className="px-2 py-1"><input className="w-full px-2 py-1 text-sm border-transparent focus:border-border rounded" value={r.email || ''} onChange={e => updateCell(i, 'email', e.target.value)} /></td>
                <td className="px-2 py-1 text-xs text-gray-500 truncate max-w-xs">{r.linkedin_url}</td>
                <td className="px-2 py-1 text-xs text-gray-500">{r.llm_score}</td>
                <td className="px-2 py-1"><button onClick={() => removeRow(i)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end mb-4">
        <button onClick={() => saveEdits.mutate()} disabled={saveEdits.isPending} className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50">
          {saveEdits.isPending ? 'Saving...' : 'Save edits'}
        </button>
      </div>

      <div className="border-t border-border-subtle pt-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Ready to deploy?</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Sender</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white" value={sender} onChange={e => setSender(e.target.value)}>
              {SENDERS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Gmail connection ID</label>
            <input className="w-full px-3 py-2 border border-border rounded-lg text-sm font-mono text-xs" value={gmailConnectionId} onChange={e => setGmailConnectionId(e.target.value)} />
            <p className="text-[10px] text-gray-400 mt-0.5">Composio connection UUID for the Gmail to send from</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Mode</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white" value={runMode} onChange={e => setRunMode(e.target.value)}>
              <option value="bulk">Bulk (all drafts to Gmail)</option>
              <option value="single">Single (one-by-one approval)</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => deploy.mutate()}
          disabled={deploy.isPending || rows.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-zamp-600 text-white rounded-lg text-sm font-semibold hover:bg-zamp-700 disabled:opacity-50"
        >
          {deploy.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Deploy {rows.length} landing pages + draft emails
        </button>
      </div>
    </div>
  )
}

// ─── Deploy progress — per-prospect cards with real-time status ─────────
function DeployProgressPanel({ job }) {
  const rows = Array.isArray(job.csv_data) ? job.csv_data : []
  // Build per-prospect status from events
  const byProspect = useMemo(() => {
    const map = new Map()
    for (const r of rows) {
      map.set(`${r.name}|${r.company}`, { ...r, status: 'pending', page_url: null, draft_id: null, error: null })
    }
    for (const e of (job.events || [])) {
      if (!e.prospect_name) continue
      const k = `${e.prospect_name}|${e.prospect_company}`
      const p = map.get(k) || { name: e.prospect_name, company: e.prospect_company }
      if (e.event_type === 'page_deploy_success') { p.page_url = e.event_data?.url; p.status = 'page_done' }
      if (e.event_type === 'page_deploy_failed')  { p.status = 'failed'; p.error = e.event_data?.error }
      if (e.event_type === 'draft_created')        { p.draft_id = e.event_data?.gmail_draft_id; p.subject = e.event_data?.subject; p.status = 'done' }
      if (e.event_type === 'draft_failed')         { p.status = 'draft_failed'; p.error = e.event_data?.error }
      map.set(k, p)
    }
    return Array.from(map.values())
  }, [job.events, rows])

  return (
    <div className="bg-white border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Deploy progress</h2>
        <div className="text-sm text-gray-500">
          <span className="font-semibold text-gray-700">{job.pages_deployed}</span> pages · <span className="font-semibold text-gray-700">{job.drafts_created}</span> drafts · {job.failures > 0 && <span className="text-red-600 font-semibold">{job.failures} failed</span>}
        </div>
      </div>
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {byProspect.map((p, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <ProspectStatusIcon status={p.status} />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">{p.name} · <span className="text-gray-500 font-normal">{p.company}</span></div>
              {p.error && <div className="text-xs text-red-600 mt-0.5">{p.error}</div>}
              {p.subject && <div className="text-xs text-gray-500 mt-0.5 truncate">Subject: {p.subject}</div>}
            </div>
            <div className="flex items-center gap-2">
              {p.page_url && <a href={p.page_url} target="_blank" rel="noreferrer" className="text-xs text-zamp-600 hover:text-zamp-700 flex items-center gap-1"><ExternalLink className="w-3 h-3" /> Page</a>}
              {p.draft_id && <a href={`https://mail.google.com/mail/u/0/#drafts`} target="_blank" rel="noreferrer" className="text-xs text-zamp-600 hover:text-zamp-700 flex items-center gap-1"><Mail className="w-3 h-3" /> Draft</a>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProspectStatusIcon({ status }) {
  if (status === 'done')          return <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
  if (status === 'page_done')     return <Loader2 className="w-5 h-5 text-zamp-500 animate-spin flex-shrink-0" />
  if (status === 'failed' || status === 'draft_failed') return <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
  return <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
}

// ─── Audit log ───────────────────────────────────────────────────────────
function EventLog({ events }) {
  const [open, setOpen] = useState(false)
  if (!events.length) return null
  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-between">
        <span>Audit log ({events.length} events)</span>
        <span className="text-xs text-gray-400">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="border-t border-border-subtle max-h-96 overflow-y-auto">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-border-subtle">
              {events.map(e => (
                <tr key={e.id}>
                  <td className="px-4 py-2 text-gray-400 font-mono whitespace-nowrap">{new Date(e.created_at).toLocaleTimeString()}</td>
                  <td className="px-4 py-2 font-medium text-gray-700 whitespace-nowrap">{e.event_type}</td>
                  <td className="px-4 py-2 text-gray-500">{e.prospect_name || '—'}</td>
                  <td className="px-4 py-2 text-gray-500 font-mono truncate max-w-md">{JSON.stringify(e.event_data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
