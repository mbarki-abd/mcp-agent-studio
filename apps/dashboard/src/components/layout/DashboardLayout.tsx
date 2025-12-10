import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardHome } from '../../pages/Dashboard';

export function DashboardLayout() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  return (
    <div className="min-h-screen flex">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <PageContent page={currentPage} />
        </main>
      </div>
    </div>
  );
}

function PageContent({ page }: { page: string }) {
  switch (page) {
    case 'dashboard':
      return <DashboardHome />;
    case 'servers':
      return <ServersPlaceholder />;
    case 'agents':
      return <AgentsPlaceholder />;
    case 'tasks':
      return <TasksPlaceholder />;
    case 'tools':
      return <ToolsPlaceholder />;
    case 'monitoring':
      return <MonitoringPlaceholder />;
    case 'settings':
      return <SettingsPlaceholder />;
    default:
      return <DashboardHome />;
  }
}

function ServersPlaceholder() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Servers</h1>
      <p className="text-muted-foreground">Server configuration will be implemented here.</p>
    </div>
  );
}

function AgentsPlaceholder() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Agents</h1>
      <p className="text-muted-foreground">Agent management will be implemented here.</p>
    </div>
  );
}

function TasksPlaceholder() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tasks</h1>
      <p className="text-muted-foreground">Task management will be implemented here.</p>
    </div>
  );
}

function ToolsPlaceholder() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tools</h1>
      <p className="text-muted-foreground">Unix tools management will be implemented here.</p>
    </div>
  );
}

function MonitoringPlaceholder() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Monitoring</h1>
      <p className="text-muted-foreground">Real-time monitoring will be implemented here.</p>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground">Settings will be implemented here.</p>
    </div>
  );
}
