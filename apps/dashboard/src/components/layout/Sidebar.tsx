import {
  Bot,
  Server,
  ListTodo,
  Package,
  Activity,
  Settings,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'servers', label: 'Servers', icon: Server },
  { id: 'agents', label: 'Agents', icon: Bot },
  { id: 'tasks', label: 'Tasks', icon: ListTodo },
  { id: 'tools', label: 'Tools', icon: Package },
  { id: 'monitoring', label: 'Monitoring', icon: Activity },
];

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-8 h-8 text-primary" />
          <span className="font-bold text-lg">MCP Studio</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              currentPage === item.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => onNavigate('settings')}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            currentPage === 'settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
