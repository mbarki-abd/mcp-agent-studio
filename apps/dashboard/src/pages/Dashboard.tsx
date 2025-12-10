import { Bot, Server, ListTodo, Activity } from 'lucide-react';

export function DashboardHome() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to MCP Agent Studio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6">
        <StatCard
          title="Servers"
          value="0"
          description="Connected servers"
          icon={Server}
        />
        <StatCard
          title="Agents"
          value="0"
          description="Active agents"
          icon={Bot}
        />
        <StatCard
          title="Tasks"
          value="0"
          description="Tasks today"
          icon={ListTodo}
        />
        <StatCard
          title="Executions"
          value="0"
          description="Running now"
          icon={Activity}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              Add Server Configuration
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              Create New Agent
            </button>
            <button className="w-full text-left px-4 py-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
              Create New Task
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="text-center text-muted-foreground py-8">
            No recent activity
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
