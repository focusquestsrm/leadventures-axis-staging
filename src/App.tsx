import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { Shell } from './components/Shell'
import { AdminPage, BuyersOffersPage, EnginePage, IntegrationsPage, LeadsPage, OverviewPage } from './pages'

function ProtectedAdmin() {
  const { allowed } = useApp()
  return allowed('tenant:manage') || allowed('platform:manage') ? <AdminPage /> : <div className="center-state"><h1>Access denied</h1><p>Your current role cannot administer this workspace.</p></div>
}

function AppRoutes() {
  return <Shell><Routes>
    <Route path="/" element={<OverviewPage />} />
    <Route path="/acquire" element={<EnginePage engine="Acquire" />} />
    <Route path="/convert" element={<EnginePage engine="Convert" />} />
    <Route path="/route" element={<EnginePage engine="Route" />} />
    <Route path="/recover" element={<EnginePage engine="Recover" />} />
    <Route path="/optimize" element={<EnginePage engine="Optimize" />} />
    <Route path="/leads" element={<LeadsPage />} />
    <Route path="/buyers-offers" element={<BuyersOffersPage />} />
    <Route path="/integrations" element={<IntegrationsPage />} />
    <Route path="/admin" element={<ProtectedAdmin />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Shell>
}

export function App() { return <AppProvider><AppRoutes /></AppProvider> }
