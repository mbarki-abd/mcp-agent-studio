import { lazy, Suspense } from 'react';
import { Route, Navigate, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/auth';
import { WebSocketProvider } from './core/websocket';
import { ModuleLoader, moduleRegistry } from './core/modules';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Toaster } from './components/ui/toaster';
import { ToastProvider } from './lib/use-toast';

// Lazy load auth pages
const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword').then(m => ({ default: m.ResetPasswordPage })));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmail').then(m => ({ default: m.VerifyEmailPage })));

// Lazy load main pages
const SettingsPage = lazy(() => import('./pages/Settings').then(m => ({ default: m.SettingsPage })));
const Dashboard = lazy(() => import('./pages/Dashboard'));

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
import { analyticsModule } from './modules/analytics';
import { tokensModule } from './modules/tokens';
import { credentialsModule } from './modules/credentials';
import { workspacesModule } from './modules/workspaces';
import { projectsModule } from './modules/projects';
import { filesystemModule } from './modules/filesystem';
import { provisioningModule } from './modules/provisioning';

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
moduleRegistry.register(analyticsModule);
moduleRegistry.register(tokensModule);
moduleRegistry.register(credentialsModule);
moduleRegistry.register(workspacesModule);
moduleRegistry.register(projectsModule);
moduleRegistry.register(filesystemModule);
moduleRegistry.register(provisioningModule);

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
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  // Not authenticated and not on public route - show login
  if (!isAuthenticated) {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      }>
        <LoginPage />
      </Suspense>
    );
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
      <ToastProvider>
        <AppContent />
        <Toaster />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
