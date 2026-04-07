import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import DashboardPage from './pages/Dashboard';
import { EmptyStateList } from './components/ui/EmptyStateList';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          
          <Route path="/inventory" element={
            <div className="max-w-[1400px] mx-auto h-[calc(100vh-10rem)]">
              <EmptyStateList 
                title="Agent Inventory" 
                description="Manage and monitor all deployed autonomous agents."
                emptyMessage="No agents registered. Deploy your first agent to begin monitoring."
              />
            </div>
          } />

          <Route path="/observability" element={
            <div className="max-w-[1400px] mx-auto h-[calc(100vh-10rem)]">
              <EmptyStateList 
                title="Observability Logs" 
                description="Real-time traces, compute usage, and latency metrics."
                emptyMessage="System is awaiting traces. No telemetry data received."
              />
            </div>
          } />

          <Route path="/risk" element={
            <div className="max-w-[1400px] mx-auto h-[calc(100vh-10rem)]">
              <EmptyStateList 
                title="Risk Center" 
                description="Guardrail status and ML model evaluations."
                emptyMessage="No active risks detected. Guardrails are passing."
              />
            </div>
          } />

          <Route path="/audit" element={
            <div className="max-w-[1400px] mx-auto h-[calc(100vh-10rem)]">
              <EmptyStateList 
                title="Audit Log" 
                description="Immutable log of AI decisions and human approvals."
                emptyMessage="Audit trail secure. No actions recorded in the current timeframe."
              />
            </div>
          } />

          <Route path="/governance" element={
            <div className="max-w-[1400px] mx-auto h-[calc(100vh-10rem)]">
              <EmptyStateList 
                title="Governance Policies" 
                description="Checklists for AI Act, GDPR, and ISO 42001."
                emptyMessage="Compliance frameworks are unassigned. Please configure your target frameworks."
              />
            </div>
          } />

          <Route path="/board-review" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
