import { Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { IntelligenceProvider } from './context/IntelligenceContext'
import { Shell } from './components/Shell'
import { AdminPage, BuyersOffersPage } from './pages'
import { BuyerDetailPage, BuyerEcosystemPanels, LeadDetailPage, LeadEcosystemPage } from './release2Pages'
import { BuyerIntelligencePage, ConvertIntelligencePage, IntelligenceOverviewPage, ProgramIntelligencePage, RejectionIntelligencePage, RouteIntelligencePage } from './intelligencePages'
import { IntegrationDetailPage, IntegrationsHubPage, LeadHoopImportPage } from './integrationPages'
import { RecoveryDashboardPage,RecoveryDetailPage,RecoveryReviewPage } from './recoveryPages'
import { RecoveryAdministrationPage,RecoveryPathCreatePage } from './recoveryAdminPages'
import { AnomaliesPage,BuyerOptimizationPanel,ForecastsPage,OptimizationBriefPage,OptimizeDashboardPage,PacingPage,ProgramOptimizationPanel,RecommendationDetailPage,RecommendationsPage } from './optimizePages'
import { AcquireDashboardPage,AdGroupDetailPage,AdGroupScorecardPage,CampaignDetailPage,CampaignScorecardPage,ConvertAcquisitionPanel,CreativeDetailPage,CreativeScorecardPage,ExperimentsPage,MediaAccountDetailPage,MediaAccountsPanel,MediaImportFinalizePage,OptimizeAcquisitionPanel,SourceScorecardPage } from './acquirePages'
import { ApprovalCenterPage, AutomationActionDetailPage, AutomationActionsPage, AutomationNotificationsPage, AutomationOverviewPage, AutomationPoliciesPage, AutomationSafeguardsPage, AutomationSettingsPage, ExecutionHistoryPage } from './automationPages'
import { CommercialReadinessPage } from './readinessPage'

function BuyersRelease2Page() { return <><BuyersOffersPage /><BuyerEcosystemPanels /></> }
function BuyerDetailOptimizePage() { return <><BuyerDetailPage/><BuyerOptimizationPanel/></> }
function ProgramIntelligenceOptimizePage() { return <><ProgramIntelligencePage/><ProgramOptimizationPanel/></> }
function ConvertAcquirePage() { return <><ConvertIntelligencePage/><ConvertAcquisitionPanel/></> }
function OptimizeAcquirePage() { return <><OptimizeDashboardPage/><OptimizeAcquisitionPanel/></> }
function AcquireMediaPage() { return <><AcquireDashboardPage/><MediaAccountsPanel/></> }

function ProtectedAdmin() {
  const { allowed } = useApp()
  return allowed('tenant:manage') || allowed('platform:manage') ? <AdminPage /> : <div className="center-state"><h1>Access denied</h1><p>Your current role cannot administer this workspace.</p></div>
}

function ProtectedReadiness() {
  const { allowed } = useApp()
  return allowed('tenant:manage') || allowed('platform:manage') ? <CommercialReadinessPage /> : <div className="center-state"><h1>Access denied</h1><p>Commercial readiness evidence is restricted to administrators.</p></div>
}

function AppRoutes() {
  return <Shell><Routes>
    <Route path="/" element={<IntelligenceOverviewPage />} />
    <Route path="/acquire" element={<AcquireMediaPage />} />
    <Route path="/acquire/sources" element={<SourceScorecardPage />} />
    <Route path="/acquire/campaigns" element={<CampaignScorecardPage />} />
    <Route path="/acquire/campaigns/:campaignId" element={<CampaignDetailPage />} />
    <Route path="/acquire/ad-groups" element={<AdGroupScorecardPage />} />
    <Route path="/acquire/ad-groups/:adGroupId" element={<AdGroupDetailPage />} />
    <Route path="/acquire/creatives" element={<CreativeScorecardPage />} />
    <Route path="/acquire/creatives/:creativeId" element={<CreativeDetailPage />} />
    <Route path="/acquire/experiments" element={<ExperimentsPage />} />
    <Route path="/convert" element={<ConvertAcquirePage />} />
    <Route path="/route" element={<RouteIntelligencePage />} />
    <Route path="/recover" element={<RecoveryDashboardPage />} />
    <Route path="/recover/policies" element={<RecoveryAdministrationPage />} />
    <Route path="/recover/paths/new" element={<RecoveryPathCreatePage />} />
    <Route path="/recover/reviews" element={<RecoveryReviewPage />} />
    <Route path="/recover/:recoveryId" element={<RecoveryDetailPage />} />
    <Route path="/optimize" element={<OptimizeAcquirePage />} />
    <Route path="/optimize/brief" element={<OptimizationBriefPage />} />
    <Route path="/optimize/recommendations" element={<RecommendationsPage />} />
    <Route path="/optimize/recommendations/:recommendationId" element={<RecommendationDetailPage />} />
    <Route path="/optimize/forecasts" element={<ForecastsPage />} />
    <Route path="/optimize/pacing" element={<PacingPage />} />
    <Route path="/optimize/anomalies" element={<AnomaliesPage />} />
    <Route path="/automation" element={<AutomationOverviewPage />} />
    <Route path="/automation/approvals" element={<ApprovalCenterPage />} />
    <Route path="/automation/policies" element={<AutomationPoliciesPage />} />
    <Route path="/automation/actions" element={<AutomationActionsPage />} />
    <Route path="/automation/actions/:actionId" element={<AutomationActionDetailPage />} />
    <Route path="/automation/executions" element={<ExecutionHistoryPage />} />
    <Route path="/automation/safeguards" element={<AutomationSafeguardsPage />} />
    <Route path="/automation/notifications" element={<AutomationNotificationsPage />} />
    <Route path="/automation/settings" element={<AutomationSettingsPage />} />
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
    <Route path="/integrations/:integrationId/media-import" element={<MediaImportFinalizePage />} />
    <Route path="/integrations/media/:accountId" element={<MediaAccountDetailPage />} />
    <Route path="/admin" element={<ProtectedAdmin />} />
    <Route path="/admin/readiness" element={<ProtectedReadiness />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></Shell>
}

export function App() { return <AppProvider><IntelligenceProvider><AppRoutes /></IntelligenceProvider></AppProvider> }
