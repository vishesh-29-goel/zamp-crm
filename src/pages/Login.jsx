import { useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../lib/auth'


// Inline JWT decode — no import ambiguity
function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export default function Login() {
  const { signIn } = useAuth()
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError(null)
    try {
      const decoded = parseJwt(credentialResponse.credential)
      if (!decoded) throw new Error('Could not decode token')
      await signIn(decoded)
    } catch (e) {
      setError(e.message || 'Sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-lg bg-[#171717] flex items-center justify-center shadow-sm">
            <img src="/zamp-icon.svg" alt="Zamp" className="w-4 h-4 invert" />
          </div>
          <div>
            <p className="text-gray-900 font-bold text-xl leading-none">Zamp CRM</p>
            <p className="text-gray-400 text-xs mt-0.5">Revenue Intelligence</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-border rounded-2xl p-8 text-center shadow-sm">
          <h1 className="text-gray-900 font-semibold text-lg mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm mb-8">Sign in with your Zamp Google account</p>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={(e) => setError('Google sign-in failed. Try again.')}
              theme="outline"
              shape="pill"
              text="signin_with"
              logo_alignment="center"
            />
          </div>

          {loading && (
            <p className="mt-5 text-gray-400 text-sm animate-pulse">Signing in…</p>
          )}

          {error && (
            <div className="mt-5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <p className="text-gray-300 text-xs mt-6">Restricted to @zamp.ai accounts</p>
          <p className="text-gray-400 text-xs mt-3">Made with ❤️ on Pace</p>
        </div>
      </div>
    </div>
  )
}
