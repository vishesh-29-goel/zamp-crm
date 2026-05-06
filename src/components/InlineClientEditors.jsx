import { useState, useEffect, useRef } from 'react'
import { useUpdateClient } from '../lib/useApi'
import HealthBadge from './HealthBadge'
import StageBadge from './StageBadge'
import PriorityBadge from './PriorityBadge'

// ─── Inline Priority ──────────────────────────────────────────────────────────
// Click the badge → dropdown with P0 / P1 / Clear
export function InlinePriority({ client, canEdit }) {
  const [open, setOpen] = useState(false)
  const updateClient = useUpdateClient()
  const ref = useRef(null)
  const current = (client.tags || []).find(t => t === 'P0' || t === 'P1') || null

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!canEdit) return <PriorityBadge tags={client.tags} />

  async function setPriority(p) {
    const otherTags = (client.tags || []).filter(t => t !== 'P0' && t !== 'P1')
    const newTags = p ? [...otherTags, p] : otherTags
    await updateClient.mutateAsync({ id: client.id, tags: newTags })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        title="Click to change priority"
      >
        <PriorityBadge tags={client.tags} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[96px]">
          {['P0', 'P1'].map(p => (
            <button
              key={p}
              onClick={e => { e.stopPropagation(); setPriority(p) }}
              disabled={updateClient.isPending}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-zamp-50 transition-colors flex items-center justify-between ${
                current === p ? 'text-zamp-600' : 'text-gray-700'
              }`}
            >
              {p} {current === p && <span className="text-zamp-400">✓</span>}
            </button>
          ))}
          {current && (
            <button
              onClick={e => { e.stopPropagation(); setPriority(null) }}
              disabled={updateClient.isPending}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 transition-colors border-t border-gray-100 mt-0.5"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Inline Health ────────────────────────────────────────────────────────────
// Click the badge → dropdown with Green / Yellow / Red
export function InlineHealth({ client, canEdit }) {
  const [open, setOpen] = useState(false)
  const updateClient = useUpdateClient()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!canEdit) return <HealthBadge health={client.health} />

  const OPTIONS = [
    { val: 'green',  label: '🟢 Green' },
    { val: 'yellow', label: '🟡 Yellow' },
    { val: 'red',    label: '🔴 Red' },
  ]

  async function setHealth(h) {
    await updateClient.mutateAsync({ id: client.id, health: h })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        title="Click to change health"
      >
        <HealthBadge health={client.health} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[116px]">
          {OPTIONS.map(o => (
            <button
              key={o.val}
              onClick={e => { e.stopPropagation(); setHealth(o.val) }}
              disabled={updateClient.isPending}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-zamp-50 transition-colors flex items-center justify-between ${
                client.health === o.val ? 'text-zamp-600' : 'text-gray-700'
              }`}
            >
              {o.label} {client.health === o.val && <span className="text-zamp-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Inline Stage ─────────────────────────────────────────────────────────────
// Click the badge → dropdown with all stages
export function InlineStage({ client, canEdit }) {
  const [open, setOpen] = useState(false)
  const updateClient = useUpdateClient()
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!canEdit) return <StageBadge stage={client.stage} />

  const STAGES = ['prospect', 'poc', 'pilot', 'live', 'churned']

  async function setStage(s) {
    await updateClient.mutateAsync({ id: client.id, stage: s })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o) }}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        title="Click to change stage"
      >
        <StageBadge stage={client.stage} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[110px]">
          {STAGES.map(s => (
            <button
              key={s}
              onClick={e => { e.stopPropagation(); setStage(s) }}
              disabled={updateClient.isPending}
              className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-zamp-50 transition-colors flex items-center justify-between capitalize ${
                client.stage === s ? 'text-zamp-600' : 'text-gray-700'
              }`}
            >
              {s} {client.stage === s && <span className="text-zamp-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
