import { Link, useLocation } from 'react-router-dom';
import {
  Bot,
  Settings,
  LayoutDashboard,
  Shield,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useModuleNavigation } from '../../core/modules';
import { useAuth } from '../../core/auth';

export function Sidebar() {
  const location = useLocation();
  const moduleNavItems = useModuleNavigation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <Bot className="w-8 h-8 text-primary" />
          <span className="font-bold text-lg">MCP Studio</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {/* Dashboard link */}
        <Link
          to="/"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            isActive('/')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span>Dashboard</span>
        </Link>

        {/* Module navigation items */}
        {moduleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                isActive(item.path)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">
                  {item.badge()}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Settings at bottom */}
      <div className="p-4 border-t border-border space-y-1">
        {/* System Config - Admin only */}
        {isAdmin && (
          <Link
            to="/system"
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              isActive('/system')
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <Shield className="w-5 h-5" />
            <span>System</span>
          </Link>
        )}
        <Link
          to="/settings"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            isActive('/settings')
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
}
