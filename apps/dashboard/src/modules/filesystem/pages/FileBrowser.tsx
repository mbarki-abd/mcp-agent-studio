import { useState, useMemo } from 'react';
import {
  FolderTree,
  Folder,
  File,
  FileCode,
  FileText,
  ChevronRight,
  Trash2,
  Edit2,
  RefreshCw,
  AlertCircle,
  Home,
  FolderPlus,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  useDirectoryListing,
  useFileContent,
  useCreateDirectory,
  useDeletePath,
  useRenamePath,
  type FileEntry,
} from '../../../core/api/hooks/filesystem';
import { useServers } from '../../../core/api/hooks/servers';
import { useAgents } from '../../../core/api/hooks/agents';
import { cn } from '../../../lib/utils';

export default function FileBrowser() {
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('./');
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['./']));
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [renameEntry, setRenameEntry] = useState<FileEntry | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Fetch servers and agents
  const { data: serversData } = useServers();
  const { data: agentsData } = useAgents({ serverId: selectedServer });

  const servers = serversData?.items || [];
  const agents = agentsData?.items || [];

  // Get server URL and token
  const server = servers.find((s) => s.id === selectedServer);
  const serverUrl = server?.url || '';
  const serverToken = server?.masterToken || '';

  // Fetch directory listing
  const {
    data: directoryData,
    isLoading: isLoadingDir,
    error: dirError,
    refetch,
  } = useDirectoryListing(serverUrl, serverToken, selectedAgent, {
    path: currentPath,
    showHidden,
  });

  // Fetch file content
  const { data: fileContent, isLoading: isLoadingFile } = useFileContent(
    serverUrl,
    serverToken,
    selectedAgent,
    selectedFile?.path || '',
    { enabled: !!selectedFile && selectedFile.type === 'file' }
  );

  // Mutations
  const createDirectory = useCreateDirectory(serverUrl, serverToken, selectedAgent);
  const deletePath = useDeletePath(serverUrl, serverToken, selectedAgent);
  const renamePath = useRenamePath(serverUrl, serverToken, selectedAgent);

  // Sort entries: directories first, then files
  const sortedEntries = useMemo(() => {
    if (!directoryData?.entries) return [];
    return [...directoryData.entries].sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [directoryData?.entries]);

  // Breadcrumb navigation
  const pathParts = currentPath.split('/').filter(Boolean);

  const getFileIcon = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      return expandedFolders.has(entry.path) ? (
        <FolderTree className="h-4 w-4 text-blue-500" />
      ) : (
        <Folder className="h-4 w-4 text-blue-500" />
      );
    }

    const ext = entry.extension?.toLowerCase();
    if (
      ext === 'js' ||
      ext === 'ts' ||
      ext === 'jsx' ||
      ext === 'tsx' ||
      ext === 'py' ||
      ext === 'java' ||
      ext === 'cpp' ||
      ext === 'c'
    ) {
      return <FileCode className="h-4 w-4 text-green-500" />;
    }

    if (ext === 'txt' || ext === 'md' || ext === 'json' || ext === 'xml' || ext === 'yaml') {
      return <FileText className="h-4 w-4 text-gray-500" />;
    }

    return <File className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      setCurrentPath(entry.path);
      setSelectedFile(null);
      const newExpanded = new Set(expandedFolders);
      if (newExpanded.has(entry.path)) {
        newExpanded.delete(entry.path);
      } else {
        newExpanded.add(entry.path);
      }
      setExpandedFolders(newExpanded);
    } else {
      setSelectedFile(entry);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setCurrentPath('./');
    } else {
      const newPath = './' + pathParts.slice(0, index + 1).join('/');
      setCurrentPath(newPath);
    }
    setSelectedFile(null);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const newPath = `${currentPath}/${newFolderName}`.replace('//', '/');
    try {
      await createDirectory.mutateAsync({ path: newPath, recursive: false });
      setNewFolderName('');
      setIsCreatingFolder(false);
      refetch();
    } catch (error) {
      console.error('Failed to create directory:', error);
    }
  };

  const handleDelete = async (entry: FileEntry) => {
    if (!window.confirm(`Are you sure you want to delete ${entry.name}?`)) return;
    try {
      await deletePath.mutateAsync({
        path: entry.path,
        recursive: entry.type === 'directory',
      });
      if (selectedFile?.path === entry.path) {
        setSelectedFile(null);
      }
      refetch();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleRename = async () => {
    if (!renameEntry || !renameValue.trim()) return;
    const parentPath = renameEntry.path.split('/').slice(0, -1).join('/') || './';
    const newPath = `${parentPath}/${renameValue}`.replace('//', '/');
    try {
      await renamePath.mutateAsync({
        sourcePath: renameEntry.path,
        destPath: newPath,
        overwrite: false,
      });
      setRenameEntry(null);
      setRenameValue('');
      if (selectedFile?.path === renameEntry.path) {
        setSelectedFile(null);
      }
      refetch();
    } catch (error) {
      console.error('Failed to rename:', error);
    }
  };

  if (!selectedServer || !selectedAgent) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <FolderTree className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Select Server and Agent</h3>
        <p className="text-muted-foreground mt-1">
          Choose a server and agent to browse their filesystem
        </p>
        <div className="mt-6 space-y-4 w-full max-w-md">
          <div>
            <label className="block text-sm font-medium mb-2">Server</label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={selectedServer}
              onChange={(e) => {
                setSelectedServer(e.target.value);
                setSelectedAgent('');
              }}
            >
              <option value="">Select a server...</option>
              {servers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          {selectedServer && (
            <div>
              <label className="block text-sm font-medium mb-2">Agent</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
              >
                <option value="">Select an agent...</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (dirError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium">Failed to load directory</h3>
        <p className="text-muted-foreground mt-1">{dirError.message}</p>
        <Button onClick={() => refetch()} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">File Browser</h1>
          <p className="text-muted-foreground">
            {server?.name} / {agents.find((a) => a.id === selectedAgent)?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHidden(!showHidden)}
          >
            {showHidden ? 'Hide Hidden' : 'Show Hidden'}
          </Button>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isLoadingDir ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2"
          onClick={() => handleBreadcrumbClick(-1)}
        >
          <Home className="h-4 w-4" />
        </Button>
        {pathParts.map((part, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => handleBreadcrumbClick(idx)}
            >
              {part}
            </Button>
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel - File List */}
        <div className="border rounded-lg bg-card">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-medium">Files & Folders</h3>
            <div className="flex gap-1">
              {!isCreatingFolder && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreatingFolder(true)}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              )}
            </div>
          </div>

          <div className="p-3 space-y-1 max-h-[600px] overflow-y-auto">
            {/* New Folder Input */}
            {isCreatingFolder && (
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFolder();
                    if (e.key === 'Escape') {
                      setIsCreatingFolder(false);
                      setNewFolderName('');
                    }
                  }}
                  className="h-8"
                  autoFocus
                />
                <Button size="sm" onClick={handleCreateFolder}>
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsCreatingFolder(false);
                    setNewFolderName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}

            {isLoadingDir ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-10 rounded bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : sortedEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Empty directory</p>
              </div>
            ) : (
              sortedEntries.map((entry) => (
                <div
                  key={entry.path}
                  className={cn(
                    'flex items-center justify-between p-2 rounded hover:bg-muted cursor-pointer group',
                    selectedFile?.path === entry.path && 'bg-muted'
                  )}
                  onClick={() => handleEntryClick(entry)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileIcon(entry)}
                    {renameEntry?.path === entry.path ? (
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename();
                          if (e.key === 'Escape') {
                            setRenameEntry(null);
                            setRenameValue('');
                          }
                        }}
                        className="h-7 max-w-[200px]"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-sm truncate">{entry.name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameEntry(entry);
                        setRenameValue(entry.name);
                      }}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(entry);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel - File Details/Preview */}
        <div className="border rounded-lg bg-card">
          <div className="p-3 border-b">
            <h3 className="font-medium">Details</h3>
          </div>
          <div className="p-3">
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  {getFileIcon(selectedFile)}
                  <div className="flex-1">
                    <h4 className="font-medium">{selectedFile.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedFile.path}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Size:</span>
                    <p className="font-medium">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modified:</span>
                    <p className="font-medium text-xs">
                      {formatDate(selectedFile.modifiedAt)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Permissions:</span>
                    <p className="font-medium font-mono text-xs">
                      {selectedFile.permissions}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Owner:</span>
                    <p className="font-medium">{selectedFile.owner}</p>
                  </div>
                </div>

                {selectedFile.type === 'file' && fileContent && (
                  <div>
                    <h5 className="text-sm font-medium mb-2">Content Preview</h5>
                    {fileContent.isBinary ? (
                      <div className="text-center py-8 text-muted-foreground bg-muted rounded">
                        <File className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Binary file - cannot preview</p>
                      </div>
                    ) : (
                      <div className="max-h-[400px] overflow-y-auto bg-muted rounded p-3">
                        <pre className="text-xs font-mono whitespace-pre-wrap">
                          {fileContent.content}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {isLoadingFile && (
                  <div className="text-center py-8">
                    <RefreshCw className="h-6 w-6 mx-auto animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a file or folder to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
