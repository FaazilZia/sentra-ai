import { lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './lib/auth';
import { SidebarProvider } from './context/SidebarContext';

const DashboardPage = lazy(() => import('./pages/v2/OverviewSection'));
const AgentsPage = lazy(() => import('./pages/v2/AgentsSection'));
const CompliancePage = lazy(() => import('./pages/v2/ComplianceSection'));
const ActivityPage = lazy(() => import('./pages/v2/ActivitySection'));
const PoliciesPage = lazy(() => import('./pages/v2/PoliciesSection'));
const RiskCenterPage = lazy(() => import('./pages/v2/RiskSection'));
const EvidencePage = lazy(() => import('./pages/v2/EvidenceSection'));
const IncidentManagementPage = lazy(() => import('./pages/IncidentManagement'));
const GuardrailsPage = lazy(() => import('./pages/Guardrails'));
const LoginPage = lazy(() => import('./pages/Login'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvite'));
const ShadowAIPage = lazy(() => import('./pages/ShadowAI'));
const InventoryPage = lazy(() => import('./pages/Inventory'));
const SettingsPage = lazy(() => import('./pages/v2/SettingsSection'));
const DriftPage = lazy(() => import('./pages/Drift'));
const ConsentManagerPage = lazy(() => import('./pages/ConsentManager'));

// GRC features pages
const AdvisorPage = lazy(() => import('./pages/Advisor'));
const AutomationsPage = lazy(() => import('./pages/Automations'));
const DatasetsPage = lazy(() => import('./pages/Datasets'));
const GovernanceOSPage = lazy(() => import('./pages/GovernanceOS'));

// Governance pages
const AIRegistryPage = lazy(() => import('./pages/AIRegistry'));
const RiskAssessmentPage = lazy(() => import('./pages/RiskAssessment'));
const ImpactAssessmentsPage = lazy(() => import('./pages/ImpactAssessments'));
const ControlsPage = lazy(() => import('./pages/Controls'));
const VendorRiskPage = lazy(() => import('./pages/VendorRisk'));
const ObligationsPage = lazy(() => import('./pages/Obligations'));
const WorkflowsPage = lazy(() => import('./pages/Workflows'));
const TasksPage = lazy(() => import('./pages/Tasks'));
const FileManagerPage = lazy(() => import('./pages/FileManager'));
const ExecutiveReportPage = lazy(() => import('./pages/ExecutiveReport'));
const TrustPortalPage = lazy(() => import('./pages/TrustPortal'));
const IntakePage = lazy(() => import('./pages/Intake'));
const SharedViewPage = lazy(() => import('./pages/SharedView'));
const EvaluationDashboardPage = lazy(() => import('./pages/EvaluationDashboard'));
const SuperadminPage = lazy(() => import('./pages/Superadmin'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

// Discovered & Readiness Pages
const ReadinessDashboardPage = lazy(() => import('./pages/ReadinessDashboard'));
const EntityGraphPage = lazy(() => import('./pages/EntityGraph'));
const IntakeFormBuilderPage = lazy(() => import('./pages/IntakeFormBuilder'));
const AgentDiscoveryPage = lazy(() => import('./pages/AgentDiscovery'));
const AuditExplorerPage = lazy(() => import('./pages/AuditExplorer'));
const LiveBlockFeedPage = lazy(() => import('./pages/LiveBlockFeed'));
const GDPRPage = lazy(() => import('./pages/GDPR'));
const HIPAAPage = lazy(() => import('./pages/HIPAA'));
const PCIDSSPage = lazy(() => import('./pages/PCIDSS'));
const DPDPPage = lazy(() => import('./pages/DPDP'));

import { ModalProvider } from './components/shared/ModalProvider';
import { ToastProvider } from './components/shared/ToastProvider';

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoaderCircle className="h-8 w-8 animate-spin text-[var(--royal-indigo)]" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Initializing System...</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteFallback />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function LoginRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || '/app';

  if (loading) {
    return <RouteFallback />;
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  return <LoginPage />;
}

function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <RouteFallback />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/app" replace />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-[var(--royal-indigo)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] font-mono">SENTRAA.AI // AUTH_SYNC</span>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Standalone completely public trust portal bypasses app shell */}
          <Route path="/public/:orgSlug/trust" element={<TrustPortalPage />} />
          <Route path="/share/:token" element={<SharedViewPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/accept-invite" element={<AcceptInvitePage />} />

          <Route path="/login" element={<LoginRoute />} />

          <Route path="/app" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/app/agents" element={<ProtectedRoute><AgentsPage /></ProtectedRoute>} />
          <Route path="/app/activity" element={<ProtectedRoute><ActivityPage /></ProtectedRoute>} />
          <Route path="/app/policies" element={<ProtectedRoute><PoliciesPage /></ProtectedRoute>} />
          <Route path="/app/incidents" element={<ProtectedRoute><IncidentManagementPage /></ProtectedRoute>} />
          <Route path="/app/guardrails" element={<ProtectedRoute><GuardrailsPage /></ProtectedRoute>} />
          <Route path="/app/risk" element={<ProtectedRoute><RiskCenterPage /></ProtectedRoute>} />
          <Route path="/app/compliance" element={<ProtectedRoute><CompliancePage /></ProtectedRoute>} />
          <Route path="/app/evidence" element={<ProtectedRoute><EvidencePage /></ProtectedRoute>} />
          <Route path="/app/drift" element={<ProtectedRoute><DriftPage /></ProtectedRoute>} />
          <Route path="/app/shadow" element={<ProtectedRoute><ShadowAIPage /></ProtectedRoute>} />
          <Route path="/app/inventory" element={<ProtectedRoute><InventoryPage /></ProtectedRoute>} />
          <Route path="/app/consent" element={<ProtectedRoute><ConsentManagerPage /></ProtectedRoute>} />
          <Route path="/app/ai-registry" element={<ProtectedRoute><AIRegistryPage /></ProtectedRoute>} />
          <Route path="/app/risk-assessment" element={<ProtectedRoute><RiskAssessmentPage /></ProtectedRoute>} />
          <Route path="/app/impact-assessments" element={<ProtectedRoute><ImpactAssessmentsPage /></ProtectedRoute>} />
          <Route path="/app/controls" element={<ProtectedRoute><ControlsPage /></ProtectedRoute>} />
          <Route path="/app/vendor-risk" element={<ProtectedRoute><VendorRiskPage /></ProtectedRoute>} />
          <Route path="/app/obligations" element={<ProtectedRoute><ObligationsPage /></ProtectedRoute>} />
          <Route path="/app/workflows" element={<ProtectedRoute><WorkflowsPage /></ProtectedRoute>} />
          <Route path="/app/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/app/files" element={<ProtectedRoute><FileManagerPage /></ProtectedRoute>} />
          <Route path="/app/intake" element={<ProtectedRoute><IntakePage /></ProtectedRoute>} />
          <Route path="/app/executive-report" element={<ProtectedRoute><ExecutiveReportPage /></ProtectedRoute>} />
          <Route path="/app/advisor" element={<ProtectedRoute><AdvisorPage /></ProtectedRoute>} />
          <Route path="/app/automations" element={<ProtectedRoute><AutomationsPage /></ProtectedRoute>} />
          <Route path="/app/datasets" element={<ProtectedRoute><DatasetsPage /></ProtectedRoute>} />
          <Route path="/app/governance-os" element={<ProtectedRoute><GovernanceOSPage /></ProtectedRoute>} />
          <Route path="/app/evaluation" element={<ProtectedRoute><EvaluationDashboardPage /></ProtectedRoute>} />
          <Route path="/app/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/app/readiness" element={<ProtectedRoute><ReadinessDashboardPage /></ProtectedRoute>} />
          <Route path="/app/live-feed" element={<ProtectedRoute><LiveBlockFeedPage /></ProtectedRoute>} />
          <Route path="/app/gdpr" element={<ProtectedRoute><GDPRPage /></ProtectedRoute>} />
          <Route path="/app/hipaa" element={<ProtectedRoute><HIPAAPage /></ProtectedRoute>} />
          <Route path="/app/pci" element={<ProtectedRoute><PCIDSSPage /></ProtectedRoute>} />
          <Route path="/app/dpdp" element={<ProtectedRoute><DPDPPage /></ProtectedRoute>} />
          <Route path="/app/entity-graph" element={<ProtectedRoute><EntityGraphPage /></ProtectedRoute>} />
          <Route path="/app/intake/builder" element={<ProtectedRoute><IntakeFormBuilderPage /></ProtectedRoute>} />
          <Route path="/app/intake/builder/:formId" element={<ProtectedRoute><IntakeFormBuilderPage /></ProtectedRoute>} />
          <Route path="/app/agent-discovery" element={<ProtectedRoute><AgentDiscoveryPage /></ProtectedRoute>} />
          <Route path="/app/audit" element={<ProtectedRoute><AuditExplorerPage /></ProtectedRoute>} />

          <Route 
            path="/superadmin" 
            element={<SuperadminRoute><SuperadminPage /></SuperadminRoute>} 
          />

          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage /></Suspense>} />
        </Routes>
        
        <ModalProvider />
        <ToastProvider />
      </Suspense>
    </SidebarProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
