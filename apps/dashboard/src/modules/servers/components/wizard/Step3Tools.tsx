import { useEffect, useState } from 'react';
import { Package, Check, Loader2, Search } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import { useWizard } from './WizardContext';
import { useToolsCatalog } from '../../../../core/api/hooks';

const TOOL_ICONS: Record<string, string> = {
  git: 'Git',
  docker: 'Docker',
  node: 'Node.js',
  python3: 'Python',
  kubectl: 'K8s',
  'azure-cli': 'Azure',
  gcloud: 'GCP',
  'aws-cli': 'AWS',
  terraform: 'TF',
  helm: 'Helm',
};

const CATEGORY_LABELS: Record<string, string> = {
  VERSION_CONTROL: 'Version Control',
  CONTAINER: 'Containers',
  LANGUAGE_RUNTIME: 'Language Runtimes',
  KUBERNETES: 'Kubernetes',
  CLOUD_CLI: 'Cloud CLIs',
  DEVOPS: 'DevOps',
};

export function Step3Tools() {
  const { data, updateData, setCanProceed } = useWizard();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: tools, isLoading } = useToolsCatalog();

  // This step is always optional
  useEffect(() => {
    setCanProceed(true);
  }, [setCanProceed]);

  const toggleTool = (toolId: string) => {
    const newSelection = data.selectedTools.includes(toolId)
      ? data.selectedTools.filter((id) => id !== toolId)
      : [...data.selectedTools, toolId];
    updateData({ selectedTools: newSelection });
  };

  const filteredTools = tools?.filter(
    (tool) =>
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedTools = filteredTools?.reduce((acc, tool) => {
    const category = tool.category || 'OTHER';
    if (!acc[category]) acc[category] = [];
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, typeof filteredTools>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Package className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Select Tools</h2>
        <p className="text-muted-foreground mt-1">
          Choose tools to install on the server (optional)
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {data.selectedTools.length > 0 && (
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary mb-2">
            {data.selectedTools.length} tool{data.selectedTools.length > 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap gap-2">
            {data.selectedTools.map((toolId) => {
              const tool = tools?.find((t) => t.id === toolId);
              return (
                <span
                  key={toolId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-primary-foreground rounded-md text-sm cursor-pointer hover:bg-primary/90"
                  onClick={() => toggleTool(toolId)}
                >
                  {tool?.displayName || toolId}
                  <span className="text-xs ml-1">×</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
        {groupedTools &&
          Object.entries(groupedTools).map(([category, categoryTools]) => (
            <div key={category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                {CATEGORY_LABELS[category] || category}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {categoryTools?.map((tool) => {
                  const isSelected = data.selectedTools.includes(tool.id);
                  return (
                    <div
                      key={tool.id}
                      onClick={() => toggleTool(tool.id)}
                      className={`
                        relative p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }
                      `}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Check className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold">
                            {TOOL_ICONS[tool.name] || tool.name.slice(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{tool.displayName}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {tool.description}
                          </p>
                          {tool.requiresSudo && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs">
                              sudo
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {(!tools || tools.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No tools available in the catalog</p>
          <p className="text-sm">You can add tools later from the server details page</p>
        </div>
      )}
    </div>
  );
}
