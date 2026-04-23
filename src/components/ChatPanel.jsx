import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, X, ChevronDown, Sparkles, Bot, User, Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { usePods } from '../lib/useApi'

const API_BASE = import.meta.env.VITE_API_URL ?? 'https://zamp-crm-api-production.up.railway.app'

const SUGGESTED = [
  'How many clients do I have?',
  'Which clients are red health?',
  'What are my overdue tasks?',
  'Summarise my pod pipeline',
  'Any open asks this week?',
  'Which clients have no ARR?',
]

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser ? 'bg-zamp-500' : 'bg-gray-100'
      }`}>
        {isUser
          ? <User className="w-3 h-3 text-white" />
          : <Bot className="w-3 h-3 text-zamp-600" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-zamp-600 text-white rounded-tr-sm'
          : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-tl-sm'
      }`}>
        {msg.content}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Bot className="w-3 h-3 text-zamp-600" />
      </div>
      <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm bg-gray-50 border border-gray-100 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default function ChatPanel({ defaultPodId = null }) {
  const { user, role } = useAuth()
  const { data: pods = [] } = usePods()
  const isSuperAdmin = role === 'SUPERADMIN'

  // Pod selector state — null means "All Pods" (SUPERADMIN default)
  const [selectedPodId, setSelectedPodId] = useState(
    isSuperAdmin ? null : (user?.zampian?.pod_id ?? null)
  )

  const [open,     setOpen]     = useState(false)
  const [input,    setInput]    = useState('')
  const [history,  setHistory]  = useState([])
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)

  // Scroll to bottom whenever history changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  const activePodLabel = isSuperAdmin
    ? (selectedPodId ? pods.find(p => String(p.id) === String(selectedPodId))?.name ?? 'Pod' : 'All Pods')
    : (user?.zampian?.pod_name ?? 'My Pod')

  async function sendMessage(text) {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')
    setError(null)

    const userMsg = { role: 'user', content: msg }
    const newHistory = [...history, userMsg]
    setHistory(newHistory)
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-zampian-email': user.email,
        },
        body: JSON.stringify({
          message: msg,
          pod_id: isSuperAdmin ? (selectedPodId ?? null) : undefined,
          history: history.slice(-10),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Something went wrong')
      }

      const data = await res.json()
      setHistory(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (e) {
      setError(e.message)
      setHistory(prev => [...prev, { role: 'assistant', content: `Sorry, I ran into an error: ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearChat() {
    setHistory([])
    setError(null)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zamp-50 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-zamp-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Ask Pace</p>
            <p className="text-[11px] text-gray-400 leading-none mt-0.5">{activePodLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pod selector — SUPERADMIN only */}
          {isSuperAdmin && pods.length > 0 && (
            <select
              value={selectedPodId ?? ''}
              onChange={e => {
                setSelectedPodId(e.target.value || null)
                clearChat()
              }}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-zamp-500 max-w-[130px]"
            >
              <option value="">All Pods</option>
              {pods.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}

          {history.length > 0 && (
            <button
              onClick={clearChat}
              className="text-[11px] text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-6">
            <div className="w-10 h-10 rounded-xl bg-zamp-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-zamp-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">Ask anything about {activePodLabel}</p>
              <p className="text-xs text-gray-400 mt-1">Live CRM data · Powered by Pace</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {SUGGESTED.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-left text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:border-zamp-300 hover:bg-zamp-50 hover:text-zamp-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-zamp-400 focus-within:ring-2 focus-within:ring-zamp-500/20 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Ask about ${activePodLabel}…`}
            rows={1}
            className="flex-1 text-sm bg-transparent resize-none outline-none text-gray-800 placeholder:text-gray-400 max-h-28 leading-relaxed"
            style={{ scrollbarWidth: 'none' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-7 h-7 rounded-lg bg-zamp-600 flex items-center justify-center hover:bg-zamp-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              : <Send className="w-3.5 h-3.5 text-white" />
            }
          </button>
        </div>
        <p className="text-[10px] text-gray-300 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}
