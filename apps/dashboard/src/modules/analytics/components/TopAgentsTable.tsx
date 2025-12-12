interface TopAgent {
  id: string;
  name: string;
  displayName: string;
  completedTasks: number;
  successRate: number;
  avgDuration: number;
}

interface TopAgentsTableProps {
  agents: TopAgent[];
}

export function TopAgentsTable({ agents }: TopAgentsTableProps) {
  if (!agents || agents.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-muted-foreground">
        No agent data available
      </div>
    );
  }

  const getBadgeClass = (successRate: number) => {
    if (successRate >= 90) return 'bg-primary text-primary-foreground';
    if (successRate >= 70) return 'bg-secondary text-secondary-foreground';
    return 'bg-destructive text-destructive-foreground';
  };

  return (
    <div className="space-y-3">
      {agents.slice(0, 5).map((agent, index) => (
        <div
          key={agent.id}
          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
            <div>
              <div className="font-medium">{agent.displayName || agent.name}</div>
              <div className="text-sm text-muted-foreground">
                {agent.completedTasks} tasks completed
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getBadgeClass(agent.successRate)}`}>
              {agent.successRate}%
            </span>
            <div className="text-xs text-muted-foreground mt-1">
              ~{Math.round(agent.avgDuration / 1000)}s avg
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
