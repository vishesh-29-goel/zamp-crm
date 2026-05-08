import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import DOMPurify from 'dompurify'
import { format } from 'date-fns'
import {
  X, Clock, User, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  ExternalLink,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// DOMPurify config: allow class/style for blockquotes/fonts, strip scripts
// ---------------------------------------------------------------------------
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    'p','br','div','span','a','b','i','strong','em','u','s',
    'h1','h2','h3','h4','h5','h6',
    'ul','ol','li','blockquote','pre','code',
    'table','thead','tbody','tr','th','td',
    'img','hr','font','center',
  ],
  ALLOWED_ATTR: [
    'href','src','alt','title','class','style','width','height',
    'align','valign','color','size','face','border','cellpadding','cellspacing',
    'bgcolor','colspan','rowspan',
  ],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script','iframe','object','embed','form','input','link'],
  FORBID_ATTR: ['onerror','onload','onclick','onmouseover','onmouseout',
                'onfocus','onblur','onchange','onsubmit'],
}

function sanitizeHtml(html) {
  return DOMPurify.sanitize(html, PURIFY_CONFIG)
}

// ---------------------------------------------------------------------------
// Helper: format recipients jsonb array → display string
// ---------------------------------------------------------------------------
function formatRecipients(arr, max = 999) {
  if (!arr || !arr.length) return ''
  const names = arr.map(r => {
    if (typeof r === 'string') return r
    return r.name || r.email || ''
  }).filter(Boolean)
  const shown = names.slice(0, max)
  const rest  = names.length - shown.length
  return shown.join(', ') + (rest > 0 ? ` +${rest} more` : '')
}

function formatRecipientsExpanded(arr) {
  if (!arr || !arr.length) return []
  return arr.map(r => {
    if (typeof r === 'string') return r
    const name  = r.name  || ''
    const email = r.email || ''
    if (name && email) return `${name} <${email}>`
    return name || email
  }).filter(Boolean)
}

// ---------------------------------------------------------------------------
// RecipientsRow
// ---------------------------------------------------------------------------
function RecipientsRow({ message }) {
  const [expanded, setExpanded] = useState(false)

  const toList   = message.recipients || []
  const ccList   = message.cc || []

  const collapsedLabel = formatRecipients(toList, 5)
  const toFull   = formatRecipientsExpanded(toList)
  const ccFull   = formatRecipientsExpanded(ccList)

  return (
    <div className="text-sm text-slate-600 mb-4">
      <div className="flex items-start gap-1">
        <span className="text-slate-400 shrink-0 mt-0.5">to</span>
        <span className="flex-1 text-slate-700">
          {expanded ? toFull.join(', ') : collapsedLabel}
        </span>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5"
          title={expanded ? 'Collapse' : 'Expand recipients'}
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {expanded && ccList.length > 0 && (
        <div className="flex items-start gap-1 mt-1">
          <span className="text-slate-400 shrink-0 mt-0.5">cc</span>
          <span className="flex-1 text-slate-600">{ccFull.join(', ')}</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// BodyCard
// ---------------------------------------------------------------------------
function BodyCard({ message }) {
  const hasHtml = !!message.email_html

  if (hasHtml) {
    const clean = sanitizeHtml(message.email_html)
    return (
      <div className="rounded-xl border border-slate-200 shadow-sm bg-white px-6 py-5 mb-4 email-body-card">
        <style>{`
          .email-body-card blockquote {
            border-left: 2px solid #cbd5e1;
            margin-left: 0;
            padding-left: 1rem;
            color: #64748b;
          }
          .email-body-card a { color: #4f46e5; }
          .email-body-card img { max-width: 100%; height: auto; }
          .email-body-card table { border-collapse: collapse; }
        `}</style>
        <div
          className="text-sm text-slate-800 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: clean }}
        />
      </div>
    )
  }

  // Plain text fallback
  const text = message.body_text || message.body_summary || '(no content)'
  return (
    <div className="rounded-xl border border-slate-200 shadow-sm bg-white px-6 py-5 mb-4">
      <pre className="text-sm text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main modal
// ---------------------------------------------------------------------------
export default function EmailMessageModal({ thread, onClose }) {
  const qc = useQueryClient()
  const [cursor, setCursor] = useState(null) // index into messages array

  const { data, isLoading } = useQuery({
    queryKey: ['email-messages', thread.id],
    queryFn: () => api.emailReachOutMessages(thread.id),
    enabled: !!thread.id,
  })

  const messages = data?.messages || []

  // Default to latest message
  useEffect(() => {
    if (messages.length > 0 && cursor === null) {
      setCursor(messages.length - 1)
    }
  }, [messages.length, cursor])

  // Reset cursor when thread changes (shouldn't normally happen, but safety)
  useEffect(() => {
    setCursor(null)
  }, [thread.id])

  const currentMessage = cursor !== null ? messages[cursor] : null
  const totalMessages  = messages.length

  // Keyboard nav
  const handleKey = useCallback((e) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowLeft'  && cursor > 0)                setCursor(c => c - 1)
    if (e.key === 'ArrowRight' && cursor < totalMessages - 1) setCursor(c => c + 1)
  }, [onClose, cursor, totalMessages])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Format timestamp
  const timestamp = currentMessage?.received_at
    ? format(new Date(currentMessage.received_at), 'dd/MM/yyyy HH:mm')
    : '—'

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* Modal panel — stop propagation so clicking inside doesn't close */}
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-[900px] max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          {/* Subject + close */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              {thread.subject || '(no subject)'}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* From / timestamp row */}
          {currentMessage && (
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2 text-sm text-slate-600 min-w-0">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-500 shrink-0">From:</span>
                <span className="font-semibold text-slate-800 truncate">
                  {currentMessage.sender_name || currentMessage.sender_email}
                </span>
                {currentMessage.sender_email && currentMessage.sender_name && (
                  <span className="text-slate-400 text-xs truncate">
                    &lt;{currentMessage.sender_email}&gt;
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{timestamp}</span>
              </div>
            </div>
          )}

          {/* Divider */}
          <hr className="border-slate-100 mb-3" />

          {/* Recipients row */}
          {currentMessage && <RecipientsRow message={currentMessage} />}
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              Loading messages…
            </div>
          )}

          {!isLoading && !currentMessage && messages.length === 0 && (
            <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
              No messages in this thread.
            </div>
          )}

          {currentMessage && (
            <BodyCard message={currentMessage} />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 rounded-b-2xl">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCursor(c => Math.max(0, c - 1))}
              disabled={!currentMessage || cursor <= 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-600
                         border border-slate-200 bg-white hover:bg-slate-50
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous email in thread
            </button>
            {totalMessages > 0 && cursor !== null && (
              <span className="text-xs text-slate-400">
                {cursor + 1} of {totalMessages}
              </span>
            )}
            <button
              onClick={() => setCursor(c => Math.min(totalMessages - 1, c + 1))}
              disabled={!currentMessage || cursor >= totalMessages - 1}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-slate-600
                         border border-slate-200 bg-white hover:bg-slate-50
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next email in thread
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Gmail link */}
          {thread.gmail_link && (
            <a
              href={thread.gmail_link}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Gmail
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
