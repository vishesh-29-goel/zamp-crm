import { useState } from 'react'
import { DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Plus, Trash2, Save, X, BarChart2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useRevenueSummary, useRevenueMonthly, useRevenueList, useUpsertRevenue, useDeleteRevenue } from '../lib/useApi'
import Spinner from '../components/Spinner'

function fmt(n) {
  const num = parseFloat(n || 0)
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000)     return `$${(num / 1_000).toFixed(0)}K`
  return `$${num.toLocaleString()}`
}

function pct(n) { return `${parseFloat(n || 0).toFixed(0)}%` }

const STATUS_STYLES = {
  invoiced: 'bg-blue-50 text-blue-700',
  partial:  'bg-yellow-50 text-yellow-700',
  collected:'bg-green-50 text-green-700',
  overdue:  'bg-red-50 text-red-700',
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function StatCard({ label, value, sub, icon: Icon, color = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon size={16} className="text-gray-400" />}
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// Modal for adding/editing a revenue record
function RevenueEntryModal({ clients, onClose }) {
  const [form, setForm] = useState({
    client_id: '',
    period_month: new Date().toISOString().slice(0, 7),
    invoiced_amount: '',
    collected_amount: '',
    status: 'invoiced',
    notes: '',
  })

  const upsert = useUpsertRevenue()

  async function handleSave() {
    if (!form.client_id || !form.period_month) return
    await upsert.mutateAsync({
      ...form,
      invoiced_amount:  parseFloat(form.invoiced_amount  || 0),
      collected_amount: parseFloat(form.collected_amount || 0),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Add / Update Revenue Record</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Client *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.client_id}
              onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
            >
              <option value="">Select client…</option>
              {clients.length === 0
                ? <option disabled>No clients loaded yet</option>
                : clients.map(c => (
                    <option key={c.client_id} value={c.client_id}>{c.client_name}</option>
                  ))
              }
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Month (YYYY-MM) *</label>
            <input
              type="month"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.period_month}
              onChange={e => setForm(f => ({ ...f, period_month: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Invoiced ($)</label>
              <input
                type="number" min="0" step="100"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="0"
                value={form.invoiced_amount}
                onChange={e => setForm(f => ({ ...f, invoiced_amount: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Collected ($)</label>
              <input
                type="number" min="0" step="100"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="0"
                value={form.collected_amount}
                onChange={e => setForm(f => ({ ...f, collected_amount: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Status</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            >
              <option value="invoiced">Invoiced</option>
              <option value="partial">Partial</option>
              <option value="collected">Collected</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              rows={2}
              placeholder="e.g. Payment received via Wio. Ref: #INV-2026-03"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button
            onClick={handleSave}
            disabled={!form.client_id || !form.period_month || upsert.isPending}
            className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40 flex items-center gap-1.5"
          >
            <Save size={14} />
            {upsert.isPending ? 'Saving…' : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Main Revenue page
export default function Revenue() {
  const [showModal, setShowModal] = useState(false)
  const [monthsFilter, setMonthsFilter] = useState(null) // null = all time

  const { data: summary, isLoading: summaryLoading, isError: summaryError } = useRevenueSummary(monthsFilter)
  const { data: monthly = [], isLoading: monthlyLoading, isError: monthlyError } = useRevenueMonthly()
  const { data: records = [], isLoading: recordsLoading } = useRevenueList(monthsFilter)
  const deleteRevenue = useDeleteRevenue()

  const clients = summary?.clients || []
  const totals  = summary?.totals  || {}

  // Prep chart data (reverse so oldest month is on left)
  const chartData = [...monthly].reverse().map(m => ({
    month:     m.period_month,
    Invoiced:  parseFloat(m.total_invoiced  || 0),
    Collected: parseFloat(m.total_collected || 0),
  }))

  const isLoading = summaryLoading || monthlyLoading || recordsLoading
  const isError   = summaryError   || monthlyError

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner />
    </div>
  )

  if (isError) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <AlertTriangle size={32} className="text-red-400" />
      <p className="text-gray-700 font-medium">Failed to load revenue data</p>
      <p className="text-sm text-gray-400">Check your connection and try refreshing the page.</p>
    </div>
  )

  const collectionRate = totals.total_invoiced > 0
    ? Math.round((totals.total_collected / totals.total_invoiced) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Revenue Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5">Actual invoiced vs collected — sourced from squad-ap-ar</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white"
            value={monthsFilter || ''}
            onChange={e => setMonthsFilter(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">All time</option>
            <option value="3">Last 3 months</option>
            <option value="6">Last 6 months</option>
            <option value="12">Last 12 months</option>
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-gray-700"
          >
            <Plus size={15} />
            Add Record
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoiced"
          value={fmt(totals.total_invoiced)}
          sub={totals.total_projected_arr ? `vs ${fmt(totals.total_projected_arr)} projected ARR` : undefined}
          icon={DollarSign}
        />
        <StatCard
          label="Total Collected"
          value={fmt(totals.total_collected)}
          icon={CheckCircle2}
          color="text-green-700"
        />
        <StatCard
          label="Outstanding"
          value={fmt(totals.total_outstanding)}
          icon={AlertTriangle}
          color={totals.total_outstanding > 0 ? 'text-yellow-700' : 'text-gray-900'}
        />
        <StatCard
          label="Collection Rate"
          value={pct(collectionRate)}
          sub={`${clients.length} active clients`}
          icon={TrendingUp}
          color={collectionRate >= 90 ? 'text-green-700' : collectionRate >= 70 ? 'text-yellow-700' : 'text-red-700'}
        />
      </div>

      {/* Bar chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Monthly Invoiced vs Collected</h2>
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-gray-400">
            <BarChart2 size={28} className="opacity-30" />
            <p className="text-sm">No monthly data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barGap={4}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickFormatter={m => {
                  const [y, mo] = m.split('-')
                  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleString('default', { month: 'short', year: '2-digit' })
                }}
              />
              <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={v => fmt(v)}
                labelFormatter={m => {
                  const [y, mo] = m.split('-')
                  return new Date(parseInt(y), parseInt(mo) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Invoiced"  fill="#e5e7eb" radius={[4,4,0,0]} />
              <Bar dataKey="Collected" fill="#111827" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-client table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-700">Per-Client Revenue</h2>
        </div>
        {clients.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">
            No revenue records yet. Click "Add Record" to start tracking.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Client</th>
                <th className="text-right px-4 py-3">Projected ARR</th>
                <th className="text-right px-4 py-3">Invoiced</th>
                <th className="text-right px-4 py-3">Collected</th>
                <th className="text-right px-4 py-3">Outstanding</th>
                <th className="text-right px-4 py-3">Coll. Rate</th>
                <th className="text-center px-4 py-3">Latest</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clients.map(c => (
                <tr key={c.client_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{c.client_name}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{c.projected_arr ? fmt(c.projected_arr) : '—'}</td>
                  <td className="px-4 py-3 text-right">{fmt(c.total_invoiced)}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt(c.total_collected)}</td>
                  <td className="px-4 py-3 text-right">
                    {parseFloat(c.total_outstanding) > 0
                      ? <span className="text-yellow-700">{fmt(c.total_outstanding)}</span>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      parseFloat(c.collection_rate_pct) >= 90 ? 'text-green-700' :
                      parseFloat(c.collection_rate_pct) >= 70 ? 'text-yellow-700' : 'text-red-700'
                    }`}>
                      {pct(c.collection_rate_pct)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">
                    {c.latest_period || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent individual records with delete */}
      {records.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">Individual Records</h2>
            <span className="text-xs text-gray-400">{records.length} record{records.length !== 1 ? 's' : ''}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-3">Client</th>
                <th className="text-left px-4 py-3">Month</th>
                <th className="text-right px-4 py-3">Invoiced</th>
                <th className="text-right px-4 py-3">Collected</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Notes</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{r.client_name || r.client_id}</td>
                  <td className="px-4 py-3 text-gray-500">{r.period_month}</td>
                  <td className="px-4 py-3 text-right">{fmt(r.invoiced_amount)}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">{fmt(r.collected_amount)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{r.notes || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete this ${r.period_month} record for ${r.client_name || r.client_id}?`)) {
                          deleteRevenue.mutate(r.id)
                        }
                      }}
                      disabled={deleteRevenue.isPending}
                      className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30"
                      title="Delete record"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Entry modal */}
      {showModal && (
        <RevenueEntryModal
          clients={clients}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
