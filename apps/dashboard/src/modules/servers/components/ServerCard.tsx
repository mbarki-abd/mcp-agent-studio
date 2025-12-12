import { Server, MoreVertical, Trash2, Edit, RefreshCw, ExternalLink, LayoutDashboard, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import { ServerStatusBadge } from './ServerStatusBadge';
import { cn } from '../../../lib/utils';
import type { ServerConfiguration } from '@mcp/types';

interface ServerCardProps {
  server: ServerConfiguration;
  isSelected?: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onTestConnection?: () => void;
  onViewDashboard?: () => void;
}

export function ServerCard({
  server,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onTestConnection,
  onViewDashboard,
}: ServerCardProps) {
  const navigate = useNavigate();

  const handleViewDashboard = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewDashboard) {
      onViewDashboard();
    } else {
      navigate(`/servers/${server.id}`);
    }
  };

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border bg-card cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary border-primary'
      )}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg',
              server.status === 'ONLINE' ? 'bg-green-100' : 'bg-gray-100'
            )}
          >
            <Server
              className={cn(
                'h-5 w-5',
                server.status === 'ONLINE' ? 'text-green-600' : 'text-gray-600'
              )}
            />
          </div>
          <div>
            <h3 className="font-medium text-sm">{server.name}</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
              {server.url}
            </p>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewDashboard}>
              <LayoutDashboard className="h-4 w-4 mr-2" />
              View Dashboard
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(); }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTestConnection?.(); }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Test Connection
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={server.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open URL
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status & Info */}
      <div className="mt-4 flex items-center justify-between">
        <ServerStatusBadge status={server.status} />
        {server.isDefault && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            Default
          </span>
        )}
      </div>

      {/* Description */}
      {server.description && (
        <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
          {server.description}
        </p>
      )}

      {/* Capabilities */}
      {server.capabilities && Array.isArray(server.capabilities) && server.capabilities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {(server.capabilities as string[]).slice(0, 4).map((cap, idx) => (
            <span
              key={idx}
              className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700"
            >
              {cap}
            </span>
          ))}
          {(server.capabilities as string[]).length > 4 && (
            <span className="text-xs text-muted-foreground">
              +{(server.capabilities as string[]).length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {server.lastHealthCheck
            ? `Last check: ${new Date(server.lastHealthCheck).toLocaleString()}`
            : 'Never checked'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={handleViewDashboard}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
      </div>
    </div>
  );
}
