import React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import DOMPurify from 'dompurify'
import { format, differenceInHours } from 'date-fns'
import {
  ChevronDown, ChevronRight, Clock, ExternalLink, MoreVertical, User, X,
} from 'lucide-react'

// DOMPurify config
const PURIFY_CONFIG = {
  ALLOWED_TAGS: ['p','br','div','span','a','b','i','strong','em','u','s',
    'h1','h2','h3','h4','h5','h6','ul','ol','li','blockquote','pre','code',
    'table','thead','tbody','tr','th','td','img','hr','font','center'],
  ALLOWED_ATTR: ['href','src','alt','title','class','style','width','height',
    'align','valign','color','size','face','border','cellpadding','cellspacing',
    'bgcolor','colspan','rowspan','target','rel'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script','iframe','object','embed','form','input','link','meta'],
  FORBID_ATTR: ['onerror','onload','onclick','onmouseover','onmouseout','onfocus','onblur','onchange','onsubmit'],
}

function sanitizeHtml(html) {
  if (!html) return ''
  try {
    const clean = DOMPurify.sanitize(html, PURIFY_CONFIG)
    return clean.replace(/<a\s/gi, '<a target=\"_blank\" rel=\"noopener noreferrer\" ')
  } catch (err) {
    console.error('[EmailModal] DOMPurify error:', err)
    return ''
  }
}

function plaintextToHtml(text) {
  if (!text) return ''
  const lines2 = text.split('\n')
  const parsed = lines2.map(line => {
    let depth = 0; let rest = line
    while (rest.match(/^>\s?/)) { rest = rest.replace(/^>\s?/, ''); depth++ }
    return { depth, content: rest }
  })
  let html = ''; let currentDepth = 0
  for (const { depth, content } of parsed) {
    if (depth > currentDepth) { for (let i=currentDepth;i<depth;i++) html+='<blockquote>' }
    else if (depth < currentDepth) { for (let i=currentDepth;i>depth;i--) html+='</blockquote>' }
    currentDepth = depth
    const esc = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    html += esc + '<br>'
  }
  for (let i=currentDepth;i>0;i--) html += '</blockquote>'
  return html
}

function gapLabel(dateA, dateB) {
  if (!dateA || !dateB) return null
  const hours = differenceInHours(new Date(dateB), new Date(dateA))
  if (hours < 1) return 'Reply — same day'
  if (hours < 24) return `Reply — ${hours} ${hours === 1 ? 'hour' : 'hours'} later`
  const days = Math.floor(hours / 24)
  return `Reply — ${days} ${days === 1 ? 'day' : 'days'} later`
}

function DirectionPill({ message }) {
  // @zamp.ai sender_email is the canonical signal (direction field can be stale/wrong in DB)
  // Fall back to direction field only when sender_email is absent or has no domain
  const senderEmail = (message.sender_email || '').toLowerCase()
  let isOutbound
  if (senderEmail.includes('@')) {
    isOutbound = senderEmail.endsWith('@zamp.ai')
  } else {
    // No usable sender_email — fall back to direction field
    isOutbound = message.direction === 'outbound'
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isOutbound ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
    }`}>
      {isOutbound ? 'Outbound' : 'Inbound'}
    </span>
  )
}

function BodyCard({ message }) {
  let renderedHtml = null
  if (message.body_html) {
    const clean = sanitizeHtml(message.body_html)
    if (clean.trim().length > 0) { renderedHtml = clean }
  }
  if (!renderedHtml && message.email_html) {
    const clean = sanitizeHtml(message.email_html)
    if (clean.trim().length > 0) { renderedHtml = clean }
  }
  if (!renderedHtml && message.body_text) { renderedHtml = plaintextToHtml(message.body_text) }
  if (!renderedHtml && message.body_summary) { renderedHtml = plaintextToHtml(message.body_summary) }
  if (!renderedHtml) {
    return <p className='text-sm text-slate-400 italic'>Body unavailable for this message.</p>
  }
  return (
    <div className='email-body text-sm leading-relaxed'
      dangerouslySetInnerHTML={{ __html: renderedHtml }} />
  )
}

function SummaryCard({ latestMessage, qc, threadId }) {
  const [isRegenerating, setIsRegenerating] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const summarizeMutation = useMutation({
    mutationFn: ({ force } = {}) => api.emailReachOutSummarize(latestMessage.id, force ? { force: true } : undefined),
    onSuccess: (data) => {
      setIsRegenerating(false); setMenuOpen(false)
      qc.setQueryData(['email-messages', threadId], (old) => {
        if (!old) return old
        return { ...old, messages: old.messages.map((m) => m.id === latestMessage.id ? { ...m, ai_summary: data.ai_summary } : m) }
      })
    },
    onError: () => { setIsRegenerating(false) },
  })
  React.useEffect(() => {
    if (latestMessage.ai_summary === null && !summarizeMutation.isPending && !summarizeMutation.isError) {
      summarizeMutation.mutate({})
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestMessage.id, latestMessage.ai_summary])
  const isLoading = (summarizeMutation.isPending && !isRegenerating) || (latestMessage.ai_summary === null && !summarizeMutation.isError)
  const isRegenLoading = summarizeMutation.isPending && isRegenerating
  const summaryText = isRegenerating ? null : (summarizeMutation.data?.ai_summary ?? latestMessage.ai_summary)
  return (
    <div className='rounded-xl bg-indigo-50 border border-indigo-100 px-5 py-4 mb-4 relative'>
      <div className='flex items-center justify-between mb-1.5'>
        <span className='text-indigo-700 font-semibold text-sm'>Email Summary</span>
        <div className='relative'>
          <button onClick={() => setMenuOpen(o => !o)} className='p-1 rounded hover:bg-indigo-100 text-indigo-400 hover:text-indigo-600' title='Summary options'>
            <MoreVertical className='w-3.5 h-3.5' />
          </button>
          {menuOpen && (
            <div className='absolute right-0 top-6 z-10 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[130px]'>
              <button onClick={() => { setIsRegenerating(true); setMenuOpen(false); summarizeMutation.mutate({ force: true }) }}
                disabled={isRegenLoading} className='w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50'>
                Regenerate
              </button>
            </div>
          )}
        </div>
      </div>
      {summarizeMutation.isError && !isRegenLoading
        ? <p className='text-xs text-red-500 italic'>Couldn&#39;t generate summary &#8212; click Regenerate to retry</p>
        : (isLoading || isRegenLoading || !summaryText)
        ? <p className='text-indigo-400 text-sm italic'>Generating summary…</p>
        : <p className='text-indigo-900 text-sm leading-relaxed'>{summaryText}</p>
      }
    </div>
  )
}

function positionLabel(index) {
  if (index === 0) return 'Original message'
  return `Follow-up #${index}`
}

function MessageCard({ message, index, isExpanded, onToggle }) {
  const timestamp = message.received_at ? format(new Date(message.received_at), 'dd/MM/yyyy HH:mm') : '—'
  const senderDisplay = message.sender_name
    ? `${message.sender_name} <${message.sender_email || ''}>`
    : (message.sender_email || 'Unknown sender')
  return (
    <div className='rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden'>
      <div className='flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors select-none' onClick={onToggle}>
        <span className='text-slate-400 shrink-0'>
          {isExpanded ? <ChevronDown className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />}
        </span>
        <span className='text-xs font-semibold text-slate-500 shrink-0 w-32'>{positionLabel(index)}</span>
        <div className='flex items-center gap-1.5 min-w-0 flex-1'>
          <User className='w-3.5 h-3.5 text-slate-400 shrink-0' />
          <span className='text-sm text-slate-700 truncate'>{senderDisplay}</span>
        </div>
        <DirectionPill message={message} />
        <div className='flex items-center gap-1 text-xs text-slate-400 shrink-0'>
          <Clock className='w-3 h-3' />
          <span>{timestamp}</span>
        </div>
      </div>
      {isExpanded && (
        <div className='px-5 pb-5 pt-3 border-t border-slate-100'>
          <BodyCard message={message} />
        </div>
      )}
    </div>
  )
}

function InterMessageDivider({ prevMessage, nextMessage }) {
  const label = gapLabel(prevMessage?.received_at, nextMessage?.received_at)
  return (
    <div className='flex items-center gap-3 my-3'>
      <div className='flex-1 h-px bg-slate-200' />
      <span className='text-xs text-slate-400 shrink-0 whitespace-nowrap'>{label || 'Reply'}</span>
      <div className='flex-1 h-px bg-slate-200' />
    </div>
  )
}

export default function EmailMessageModal({ thread, onClose }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['email-messages', thread.id],
    queryFn: () => api.emailReachOutMessages(thread.id),
    enabled: !!thread.id,
  })
  const messages = data?.messages || []
  const [expandedMap, setExpandedMap] = useState({})
  useEffect(() => { setExpandedMap({}) }, [thread.id])
  const isExpanded = useCallback((index) => expandedMap[index] !== false, [expandedMap])
  const toggleCard = useCallback((index) => {
    setExpandedMap(prev => ({ ...prev, [index]: prev[index] === false ? true : false }))
  }, [])
  const handleKey = useCallback((e) => { if (e.key === 'Escape') onClose() }, [onClose])
  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])
  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4' onClick={onClose}>
      <div className='bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-[900px] max-h-[90vh] overflow-hidden' onClick={e => e.stopPropagation()}>
        <div className='px-6 pt-5 pb-4 border-b border-slate-100 shrink-0'>
          <div className='flex items-start justify-between gap-4'>
            <h2 className='text-lg font-bold text-slate-900 leading-snug'>{thread.subject || '(no subject)'}</h2>
            <button onClick={onClose} className='p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0'><X className='w-4 h-4' /></button>
          </div>
        </div>
        <div className='flex-1 min-h-0 overflow-y-auto px-6 py-4'>
          {isLoading && <div className='flex items-center justify-center py-16 text-slate-400 text-sm'>Loading messages…</div>}
          {!isLoading && messages.length === 0 && (
            <div className='flex items-center justify-center py-16 text-slate-500 text-sm italic'>
              No messages found for this thread — the data may not have backfilled correctly.
            </div>
          )}
          {!isLoading && latestMessage && <SummaryCard latestMessage={latestMessage} qc={qc} threadId={thread.id} />}
          {!isLoading && messages.map((msg, idx) => (
            <React.Fragment key={msg.id}>
              {idx > 0 && <InterMessageDivider prevMessage={messages[idx - 1]} nextMessage={msg} />}
              <MessageCard message={msg} index={idx} isExpanded={isExpanded(idx)} onToggle={() => toggleCard(idx)} />
            </React.Fragment>
          ))}
        </div>
        <div className='px-6 py-3 border-t border-slate-100 flex items-center justify-end shrink-0 bg-slate-50 rounded-b-2xl'>
          {thread.gmail_link && (
            <a href={thread.gmail_link} target='_blank' rel='noreferrer' className='flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:underline'>
              <ExternalLink className='w-3.5 h-3.5' />
              Open in Gmail
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
