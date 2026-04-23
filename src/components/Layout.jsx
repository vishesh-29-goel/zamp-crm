import { NavLink, Outlet, Link } from 'react-router-dom'
// NotificationBell is now embedded inside UserMenu popover
import {
  LayoutDashboard, Users, CheckSquare, Signal,
  BarChart2, Settings, LogOut, ChevronDown, ShieldAlert, Layers, DollarSign,
  Bell, Clock, Zap, AlertTriangle, MessageSquare, CheckCheck, X
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { useApprovals, useNotifications, useMarkRead, useMarkAllRead } from '../lib/useApi'

const APPROVER_ROLES = ['CEO', 'GM', 'SUPERADMIN']

const BASE_NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clients',   icon: Users,           label: 'Clients'   },
  { to: '/pods',      icon: Layers,          label: 'Pods'      },
  { to: '/tasks',     icon: CheckSquare,     label: 'My Tasks'  },
  { to: '/signals',   icon: Signal,          label: 'Signals'   },
  { to: '/analytics', icon: BarChart2,       label: 'Analytics' },
  { to: '/revenue',   icon: DollarSign,      label: 'Revenue'   },
]

// ─── Notification type config ────────────────────────────────────────────────
const NOTIF_CFG = {
  task_due_soon:      { icon: Clock,         color: 'text-amber-500',  bg: 'bg-amber-50'  },
  task_assigned:      { icon: Zap,           color: 'text-zamp-600',   bg: 'bg-zamp-50'   },
  blocker:            { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50'    },
  commitment_at_risk: { icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50'    },
  open_ask_aging:     { icon: MessageSquare, color: 'text-blue-500',   bg: 'bg-blue-50'   },
}

function timeAgo(d) {
  const s = (Date.now() - new Date(d)) / 1000
  if (s < 60)    return 'just now'
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function UserMenu({ user, signOut }) {
  const [open, setOpen] = useState(false)
  const ref             = useRef(null)
  const initials        = user.name?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?'

  const { data }    = useNotifications()
  const markRead    = useMarkRead()
  const markAllRead = useMarkAllRead()
  const notifications = data?.notifications || []
  const unreadCount   = data?.unread_count  || 0

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">

      {/* ── Trigger card ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl hover:bg-surface-page transition-colors border border-border-subtle"
      >
        <div className="relative flex-shrink-0">
          {user.picture
            ? <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
            : <div className="w-7 h-7 rounded-full bg-zamp-500 flex items-center justify-center text-white text-xs font-bold">{initials}</div>
          }
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-xs font-medium text-gray-900 truncate leading-tight">{user.name}</p>
          <p className="text-[11px] text-gray-400 truncate leading-tight">{user.email?.split('@')[0]}</p>
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* ── Popover ── */}
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 bg-white border border-border rounded-2xl shadow-2xl z-20 overflow-hidden" style={{ width: '224px' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-700">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-[10px] font-medium text-zamp-600 hover:text-zamp-700 transition-colors"
                >
                  <CheckCheck className="w-3 h-3" />
                  All read
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-64 overflow-y-auto divide-y divide-border-subtle border-t border-border-subtle">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-6">
                  <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-gray-300" />
                  </div>
                  <p className="text-[11px] text-gray-400">You're all caught up</p>
                </div>
              ) : (
                notifications.slice(0, 8).map(n => {
                  const cfg    = NOTIF_CFG[n.notification_type] || NOTIF_CFG.task_due_soon
                  const Icon   = cfg.icon
                  const isUnread = !n.read_at
                  return (
                    <button
                      key={n.id}
                      onClick={() => { if (isUnread) markRead.mutate(n.id); setOpen(false) }}
                      className={`flex items-start gap-2 w-full px-3 py-2.5 text-left hover:bg-surface-page transition-colors ${isUnread ? 'bg-zamp-50/40' : ''}`}
                    >
                      <div className={`w-5 h-5 rounded-md ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-2.5 h-2.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        {n.client_name && (
                          <p className="text-[9px] font-bold text-zamp-600 uppercase tracking-wide leading-none mb-0.5">{n.client_name}</p>
                        )}
                        <p className={`text-[11px] leading-snug ${isUnread ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                          {n.message}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                      </div>
                      {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-zamp-500 flex-shrink-0 mt-1.5" />}
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer strip — Settings + Sign out */}
            <div className="border-t border-border-subtle">
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-gray-600 hover:bg-surface-page transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-gray-400" />
                Settings
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  )
}

export default function Layout() {
  const { user, signOut, role } = useAuth()
  const isApprover = APPROVER_ROLES.includes(role)

  // Fetch pending count for badge — only runs for approvers
  const { data: approvals = [] } = useApprovals()
  const pendingCount = isApprover ? approvals.filter(a => a.status === 'pending').length : 0

  return (
    <div className="flex h-screen overflow-hidden bg-surface-page">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-white border-r border-border">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border-subtle">
          <div className="w-8 h-8 rounded-lg bg-[#171717] flex items-center justify-center shadow-sm">
            <img src="/favicon-v2.svg" alt="Zamp" className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">Zamp CRM</span>
            <p className="text-xs text-gray-400 leading-none mt-0.5">Revenue Intelligence</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5">
          {BASE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-zamp-50 text-zamp-600'
                  : 'text-gray-500 hover:bg-surface-page hover:text-gray-900'}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}

          {/* Approvals — visible to all, badge only for approvers with pending items */}
          <NavLink
            to="/approvals"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
              ${isActive
                ? 'bg-zamp-50 text-zamp-600'
                : 'text-gray-500 hover:bg-surface-page hover:text-gray-900'}`
            }
          >
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Approvals</span>
            {pendingCount > 0 && (
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none">
                {pendingCount}
              </span>
            )}
          </NavLink>
        </nav>

        {/* Footer — single user card, everything inside the popover */}
        {user && (
          <div className="p-3 border-t border-border-subtle">
            <UserMenu user={user} signOut={signOut} />
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
