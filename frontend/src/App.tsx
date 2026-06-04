import { lazy, Suspense } from 'react';
import { LoaderCircle } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { AuthProvider, useAuth } from './lib/auth';
import { SidebarProvider } from './context/SidebarContext';

const DashboardPage = lazy(() => import('./pages/Dashboard'));
const PoliciesPage = lazy(() => import('./pages/Policies'));
const GuardrailsPage = lazy(() => import('./pages/Guardrails'));
const LoginPage = lazy(() => import('./pages/Login'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvite'));
const RiskCenterPage = lazy(() => import('./pages/RiskCenter'));
const CompliancePage = lazy(() => import('./pages/Compliance'));
const EvidencePage = lazy(() => import('./pages/Evidence'));
const ShadowAIPage = lazy(() => import('./pages/ShadowAI'));
const InventoryPage = lazy(() => import('./pages/Inventory'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const DriftPage = lazy(() => import('./pages/Drift'));
const ConsentManagerPage = lazy(() => import('./pages/ConsentManager'));

// GRC features pages
const AdvisorPage = lazy(() => import('./pages/Advisor'));
const AutomationsPage = lazy(() => import('./pages/Automations'));
const DatasetsPage = lazy(() => import('./pages/Datasets'));
const TrainingRegisterPage = lazy(() => import('./pages/TrainingRegister'));
const GovernanceOSPage = lazy(() => import('./pages/GovernanceOS'));

// Governance pages
const AIRegistryPage = lazy(() => import('./pages/AIRegistry'));
const RiskAssessmentPage = lazy(() => import('./pages/RiskAssessment'));
const ImpactAssessmentsPage = lazy(() => import('./pages/ImpactAssessments'));
const CEMarkingPage = lazy(() => import('./pages/CEMarking'));
const CCPAPage = lazy(() => import('./pages/CCPA'));
const DORAPage = lazy(() => import('./pages/DORA'));
const OECDPage = lazy(() => import('./pages/OECD'));
const FTCPage  = lazy(() => import('./pages/FTC'));
const ControlsPage = lazy(() => import('./pages/Controls'));
const VendorRiskPage = lazy(() => import('./pages/VendorRisk'));
const ObligationsPage = lazy(() => import('./pages/Obligations'));
const WorkflowsPage = lazy(() => import('./pages/Workflows'));
const TasksPage = lazy(() => import('./pages/Tasks'));
const ExecutiveReportPage = lazy(() => import('./pages/ExecutiveReport'));
const TrustPortalPage = lazy(() => import('./pages/TrustPortal'));
const IntakePage = lazy(() => import('./pages/Intake'));
const SharedViewPage = lazy(() => import('./pages/SharedView'));
const EvaluationDashboardPage = lazy(() => import('./pages/EvaluationDashboard'));
const SuperadminPage = lazy(() => import('./pages/Superadmin'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));


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

function AppRoutes() {
  const { loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoaderCircle className="h-10 w-10 animate-spin text-[var(--royal-indigo)]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)] font-mono">SENTRA.AI // AUTH_SYNC</span>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <SidebarProvider>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Standalone completely public trust portal bypasses app shell */}
            <Route path="/public/:orgSlug/trust" element={<TrustPortalPage />} />
            <Route path="/share/:token" element={<SharedViewPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />

            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/app" replace />} />

            <Route 
              path="/app" 
              element={user ? <AppLayout><DashboardPage /></AppLayout> : <Navigate to="/login" replace />}
            />
            
            <Route 
              path="/app/policies" 
              element={user ? <AppLayout><PoliciesPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/guardrails" 
              element={user ? <AppLayout><GuardrailsPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/risk" 
              element={user ? <AppLayout><RiskCenterPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/compliance" 
              element={user ? <AppLayout><CompliancePage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/evidence" 
              element={user ? <AppLayout><EvidencePage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/drift" 
              element={user ? <AppLayout><DriftPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/shadow" 
              element={user ? <AppLayout><ShadowAIPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/inventory" 
              element={user ? <AppLayout><InventoryPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/consent" 
              element={user ? <AppLayout><ConsentManagerPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            {/* Governance routes */}
            <Route 
              path="/app/ai-registry" 
              element={user ? <AppLayout><AIRegistryPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/risk-assessment" 
              element={user ? <AppLayout><RiskAssessmentPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/impact-assessments" 
              element={user ? <AppLayout><ImpactAssessmentsPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/ce-marking" 
              element={user ? <AppLayout><CEMarkingPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/ccpa" 
              element={user ? <AppLayout><CCPAPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/dora" 
              element={user ? <AppLayout><DORAPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/oecd" 
              element={user ? <AppLayout><OECDPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/ftc" 
              element={user ? <AppLayout><FTCPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/controls" 
              element={user ? <AppLayout><ControlsPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/vendor-risk" 
              element={user ? <AppLayout><VendorRiskPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/obligations" 
              element={user ? <AppLayout><ObligationsPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/workflows" 
              element={user ? <AppLayout><WorkflowsPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/tasks" 
              element={user ? <AppLayout><TasksPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/intake" 
              element={user ? <AppLayout><IntakePage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/executive-report" 
              element={user ? <AppLayout><ExecutiveReportPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/advisor" 
              element={user ? <AppLayout><AdvisorPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/automations" 
              element={user ? <AppLayout><AutomationsPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/datasets" 
              element={user ? <AppLayout><DatasetsPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/training" 
              element={user ? <AppLayout><TrainingRegisterPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route 
              path="/app/governance-os" 
              element={user ? <AppLayout><GovernanceOSPage /></AppLayout> : <Navigate to="/login" replace />}
            />

            <Route path="/app/evaluation" element={user ? <AppLayout><EvaluationDashboardPage /></AppLayout> : <Navigate to="/login" replace />} />

            <Route path="/app/settings" element={user ? <AppLayout><SettingsPage /></AppLayout> : <Navigate to="/login" replace />} />

            <Route 
              path="/superadmin" 
              element={user && user.role === 'SUPER_ADMIN' ? <AppLayout><SuperadminPage /></AppLayout> : <Navigate to="/app" replace />} 
            />

            <Route path="*" element={<Suspense fallback={<RouteFallback />}><NotFoundPage /></Suspense>} />

          </Routes>
          
          <ModalProvider />
          <ToastProvider />
        </Suspense>
      </SidebarProvider>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;

