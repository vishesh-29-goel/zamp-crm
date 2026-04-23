import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Tasks from './pages/Tasks'
import Signals from './pages/Signals'
import Analytics from './pages/Analytics'
import Approvals from './pages/Approvals'
import Pods from './pages/Pods'
import Settings from './pages/Settings'
import Revenue from './pages/Revenue'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function LoginRoute() {
  const { user } = useAuth()
  if (user) return <Navigate to="/dashboard" replace />
  return <Login />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="signals" element={<Signals />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="pods" element={<Pods />} />
        <Route path="settings" element={<Settings />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
