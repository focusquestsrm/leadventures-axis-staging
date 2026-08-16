import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { Shell } from './components/Shell'
import { AdminPage, BuyersOffersPage, EnginePage, IntegrationsPage } from './pages'
import { AcquireRegistryPage, BuyerDetailPage, BuyerEcosystemPanels, LeadDetailPage, LeadEcosystemPage, Release2OverviewPage, RouteOperationsPage } from './release2Pages'

function BuyersRelease2Page() { return <><BuyersOffersPage /><BuyerEcosystemPanels /></> }

function ProtectedAdmin() {
  const { allowed } = useApp()
  return allowed('tenant:manage') || allowed('platform:manage') ? <AdminPage /> : <div className="center-state"><h1>Access denied</h1><p>Your current role cannot administer this workspace.</p></div>
}

function AppRoutes() {
  return <Shell><Routes>
    <Route path="/" element={<Release2OverviewPage />} />
    <Route path="/acquire" element={<AcquireRegistryPage />} />
    <Route path="/convert" element={<EnginePage engine="Convert" />} />
    <Route path="/route" element={<RouteOperationsPage />} />
    <Route path="/recover" element={<EnginePage engine="Recover" />} />
    <Route path="/optimize" element={<EnginePage engine="Optimize" />} />
    <Route path="/leads" element={<LeadEcosystemPage />} />
    <Route path="/leads/:leadId" element={<LeadDetailPage />} />
    <Route path="/buyers-offers" element={<BuyersRelease2Page />} />
    <Route path="/buyers-offers/buyers/:buyerId" element={<BuyerDetailPage />} />
    <Route path="/integrations" element={<IntegrationsPage />} />
    <Route path="/admin" element={<ProtectedAdmin />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Shell>
}

export function App() { return <AppProvider><AppRoutes /></AppProvider> }
