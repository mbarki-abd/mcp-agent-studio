import { Route, Navigate, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/auth';
import { WebSocketProvider } from './core/websocket';
import { ModuleLoader, moduleRegistry } from './core/modules';
import { LoginPage } from './pages/Login';
import { ForgotPasswordPage } from './pages/ForgotPassword';
import { ResetPasswordPage } from './pages/ResetPassword';
import { VerifyEmailPage } from './pages/VerifyEmail';
import { SettingsPage } from './pages/Settings';
import { DashboardLayout } from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import { Toaster } from './components/ui/toaster';

// Import modules
import { serversModule } from './modules/servers';
import { agentsModule } from './modules/agents';
import { tasksModule } from './modules/tasks';
import { monitoringModule } from './modules/monitoring';
import { toolsModule } from './modules/tools';
import { chatModule } from './modules/chat';
import { auditModule } from './modules/audit';
import { organizationModule } from './modules/organization';
import { apiKeysModule } from './modules/apikeys';

// Register modules (order matters for dependencies)
moduleRegistry.register(serversModule);
moduleRegistry.register(agentsModule);
moduleRegistry.register(tasksModule);
moduleRegistry.register(monitoringModule);
moduleRegistry.register(toolsModule);
moduleRegistry.register(chatModule);
moduleRegistry.register(auditModule);
moduleRegistry.register(organizationModule);
moduleRegistry.register(apiKeysModule);

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password', '/verify-email'];

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Handle public auth routes (accessible without authentication)
  if (isPublicRoute) {
    // If already authenticated, redirect to dashboard
    if (isAuthenticated && location.pathname === '/login') {
      return <Navigate to="/" replace />;
    }

    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Not authenticated and not on public route - show login
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Authenticated - show main app
  return (
    <WebSocketProvider isAuthenticated={isAuthenticated}>
      <DashboardLayout>
        <ModuleLoader>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </ModuleLoader>
      </DashboardLayout>
    </WebSocketProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}

export default App;
