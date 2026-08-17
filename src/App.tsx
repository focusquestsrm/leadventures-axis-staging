import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { IntelligenceProvider } from './context/IntelligenceContext'
import { Shell } from './components/Shell'
import { AdminPage, BuyersOffersPage } from './pages'
import { BuyerDetailPage, BuyerEcosystemPanels, LeadDetailPage, LeadEcosystemPage } from './release2Pages'
import { AcquireIntelligencePage, BuyerIntelligencePage, ConvertIntelligencePage, IntelligenceOverviewPage, ProgramIntelligencePage, RejectionIntelligencePage, RouteIntelligencePage } from './intelligencePages'
import { IntegrationDetailPage, IntegrationsHubPage, LeadHoopImportPage } from './integrationPages'
import { RecoveryDashboardPage,RecoveryDetailPage,RecoveryReviewPage } from './recoveryPages'
import { RecoveryAdministrationPage,RecoveryPathCreatePage } from './recoveryAdminPages'
import { AnomaliesPage,BuyerOptimizationPanel,ForecastsPage,OptimizationBriefPage,OptimizeDashboardPage,PacingPage,ProgramOptimizationPanel,RecommendationDetailPage,RecommendationsPage } from './optimizePages'

function BuyersRelease2Page() { return <><BuyersOffersPage /><BuyerEcosystemPanels /></> }
function BuyerDetailOptimizePage() { return <><BuyerDetailPage/><BuyerOptimizationPanel/></> }
function ProgramIntelligenceOptimizePage() { return <><ProgramIntelligencePage/><ProgramOptimizationPanel/></> }

function ProtectedAdmin() {
  const { allowed } = useApp()
  return allowed('tenant:manage') || allowed('platform:manage') ? <AdminPage /> : <div className="center-state"><h1>Access denied</h1><p>Your current role cannot administer this workspace.</p></div>
}

function AppRoutes() {
  return <Shell><Routes>
    <Route path="/" element={<IntelligenceOverviewPage />} />
    <Route path="/acquire" element={<AcquireIntelligencePage />} />
    <Route path="/convert" element={<ConvertIntelligencePage />} />
    <Route path="/route" element={<RouteIntelligencePage />} />
    <Route path="/recover" element={<RecoveryDashboardPage />} />
    <Route path="/recover/policies" element={<RecoveryAdministrationPage />} />
    <Route path="/recover/paths/new" element={<RecoveryPathCreatePage />} />
    <Route path="/recover/reviews" element={<RecoveryReviewPage />} />
    <Route path="/recover/:recoveryId" element={<RecoveryDetailPage />} />
    <Route path="/optimize" element={<OptimizeDashboardPage />} />
    <Route path="/optimize/brief" element={<OptimizationBriefPage />} />
    <Route path="/optimize/recommendations" element={<RecommendationsPage />} />
    <Route path="/optimize/recommendations/:recommendationId" element={<RecommendationDetailPage />} />
    <Route path="/optimize/forecasts" element={<ForecastsPage />} />
    <Route path="/optimize/pacing" element={<PacingPage />} />
    <Route path="/optimize/anomalies" element={<AnomaliesPage />} />
    <Route path="/intelligence/buyers" element={<BuyerIntelligencePage />} />
    <Route path="/intelligence/programs" element={<ProgramIntelligenceOptimizePage />} />
    <Route path="/intelligence/rejections" element={<RejectionIntelligencePage />} />
    <Route path="/leads" element={<LeadEcosystemPage />} />
    <Route path="/leads/:leadId" element={<LeadDetailPage />} />
    <Route path="/buyers-offers" element={<BuyersRelease2Page />} />
    <Route path="/buyers-offers/buyers/:buyerId" element={<BuyerDetailOptimizePage />} />
    <Route path="/integrations" element={<IntegrationsHubPage />} />
    <Route path="/integrations/:integrationId" element={<IntegrationDetailPage />} />
    <Route path="/integrations/:integrationId/import" element={<LeadHoopImportPage />} />
    <Route path="/admin" element={<ProtectedAdmin />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Shell>
}

export function App() { return <AppProvider><IntelligenceProvider><AppRoutes /></IntelligenceProvider></AppProvider> }
