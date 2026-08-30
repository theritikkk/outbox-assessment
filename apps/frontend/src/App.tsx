import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AuthCallback } from './pages/AuthCallback';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ScheduledPage } from './pages/ScheduledPage';
import { SentPage } from './pages/SentPage';
import { ComposePage } from './pages/ComposePage';
import { EmailDetailPage } from './pages/EmailDetailPage';
import { SearchPage } from './pages/SearchPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard/scheduled" replace />} />
        <Route path="scheduled" element={<ScheduledPage />} />
        <Route path="sent" element={<SentPage />} />
        <Route path="compose" element={<ComposePage />} />
        <Route path="emails/:id" element={<EmailDetailPage />} />
        <Route path="search" element={<SearchPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
