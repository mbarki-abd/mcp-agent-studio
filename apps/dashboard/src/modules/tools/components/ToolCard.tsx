import {
  Package,
  GitBranch,
  Container,
  Cloud,
  Database,
  Terminal,
  Shield,
  Code,
  Wrench,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { cn } from '../../../lib/utils';
import type { ToolDefinition, ToolCategory } from '@mcp/types';

interface ToolCardProps {
  tool: ToolDefinition;
  isInstalled?: boolean;
  installedVersion?: string;
  onInstall?: () => void;
  onUninstall?: () => void;
  onClick?: () => void;
}

const categoryIcons: Record<ToolCategory, typeof Package> = {
  VERSION_CONTROL: GitBranch,
  CONTAINER: Container,
  CLOUD_CLI: Cloud,
  KUBERNETES: Container,
  LANGUAGE_RUNTIME: Code,
  PACKAGE_MANAGER: Package,
  DATABASE_CLIENT: Database,
  DEVOPS: Wrench,
  UTILITY: Terminal,
  SECURITY: Shield,
  EDITOR: Code,
};

const categoryColors: Record<ToolCategory, string> = {
  VERSION_CONTROL: 'bg-orange-100 text-orange-600',
  CONTAINER: 'bg-blue-100 text-blue-600',
  CLOUD_CLI: 'bg-purple-100 text-purple-600',
  KUBERNETES: 'bg-cyan-100 text-cyan-600',
  LANGUAGE_RUNTIME: 'bg-green-100 text-green-600',
  PACKAGE_MANAGER: 'bg-yellow-100 text-yellow-600',
  DATABASE_CLIENT: 'bg-pink-100 text-pink-600',
  DEVOPS: 'bg-indigo-100 text-indigo-600',
  UTILITY: 'bg-gray-100 text-gray-600',
  SECURITY: 'bg-red-100 text-red-600',
  EDITOR: 'bg-teal-100 text-teal-600',
};

export function ToolCard({
  tool,
  isInstalled,
  installedVersion,
  onInstall,
  onUninstall,
  onClick,
}: ToolCardProps) {
  const Icon = categoryIcons[tool.category] || Package;

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border bg-card cursor-pointer transition-all hover:shadow-md',
        isInstalled && 'border-green-200 bg-green-50/50'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', categoryColors[tool.category])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-sm">{tool.displayName}</h3>
            <p className="text-xs text-muted-foreground">{tool.name}</p>
          </div>
        </div>

        {tool.website && (
          <a
            href={tool.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      {/* Description */}
      {tool.description && (
        <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
          {tool.description}
        </p>
      )}

      {/* Tags */}
      {Array.isArray(tool.tags) && tool.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {(tool.tags as string[]).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs bg-muted px-1.5 py-0.5 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isInstalled ? (
            <span className="text-green-600 font-medium">
              Installed {installedVersion && `v${installedVersion}`}
            </span>
          ) : (
            <span className="capitalize">
              {tool.category.toLowerCase().replace('_', ' ')}
            </span>
          )}
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          {isInstalled ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onUninstall}
              className="text-red-600 hover:text-red-700"
            >
              Uninstall
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onInstall}>
              Install
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
