import { createContext, useContext, useState } from 'react'
import { api } from './api'

const AuthContext = createContext(null)

const STORAGE_KEY = 'zamp_crm_user'
const ALLOWED_DOMAIN = 'zamp.ai'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  })

  // Fetch Zampian role/permissions from the API and merge onto the user object.
  // Called automatically on signIn; can also be called manually to refresh.
  const fetchZampian = async (email) => {
    try {
      const zampian = await api.me(email)
      // zampian shape: { id, name, email, role, pod_id, permissions: { canApprove, ... } }
      return zampian
    } catch (err) {
      // /api/me 404 means email isn't in crm_zampians yet — not fatal,
      // user can still view CRM in read-only mode
      console.warn('[auth] /api/me failed — defaulting to read-only:', err)
      return null
    }
  }

  // signIn is now async: validates domain, saves Google profile, then enriches
  // with Zampian RBAC data from the backend.
  const signIn = async (profile) => {
    const email = profile.email || ''
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      throw new Error(`Access restricted to @${ALLOWED_DOMAIN} accounts. Got: ${email}`)
    }

    const zampian = await fetchZampian(email)

    const u = {
      // Google profile fields
      id:      profile.sub,
      name:    profile.name,
      email:   profile.email,
      picture: profile.picture,
      // RBAC fields from /api/me (null if not in crm_zampians)
      zampian,
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    setUser(u)
    return u
  }

  // Call this after any role change to get fresh permissions without a full sign-out
  const refreshZampian = async () => {
    if (!user?.email) return
    const zampian = await fetchZampian(user.email)
    const updated = { ...user, zampian }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setUser(updated)
    return updated
  }

  const signOut = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUser(null)
  }

  // Convenience getters so call sites don't need to dig into user.zampian
  const role        = user?.zampian?.role        ?? null
  const permissions = user?.zampian?.permissions ?? {}
  const zampianId   = user?.zampian?.id          ?? null

  return (
    <AuthContext.Provider value={{
      user,
      signIn,
      signOut,
      refreshZampian,
      role,
      permissions,
      zampianId,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
