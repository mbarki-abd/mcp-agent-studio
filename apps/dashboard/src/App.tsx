import { Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './core/auth';
import { WebSocketProvider } from './core/websocket';
import { ModuleLoader, moduleRegistry } from './core/modules';
import { LoginPage } from './pages/Login';
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

// Register modules (order matters for dependencies)
moduleRegistry.register(serversModule);
moduleRegistry.register(agentsModule);
moduleRegistry.register(tasksModule);
moduleRegistry.register(monitoringModule);
moduleRegistry.register(toolsModule);
moduleRegistry.register(chatModule);

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <WebSocketProvider>
      <DashboardLayout>
        <ModuleLoader>
          <Route path="/" element={<Dashboard />} />
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
