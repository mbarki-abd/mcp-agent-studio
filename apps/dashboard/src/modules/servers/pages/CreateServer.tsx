import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { useCreateServer } from '../../../core/api';

const serverSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  url: z.string().url('Must be a valid URL'),
  wsUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  masterToken: z.string().min(1, 'Master token is required'),
  autoConnect: z.boolean(),
  isDefault: z.boolean(),
});

type ServerFormData = z.infer<typeof serverSchema>;

export default function CreateServer() {
  const navigate = useNavigate();
  const createServer = useCreateServer();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      autoConnect: true,
      isDefault: false,
    },
  });

  const onSubmit = async (data: ServerFormData) => {
    try {
      await createServer.mutateAsync({
        ...data,
        wsUrl: data.wsUrl || undefined,
      });
      navigate('/servers');
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/servers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Add Server</h1>
          <p className="text-muted-foreground">
            Configure a new MCP server connection
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="font-semibold">Basic Information</h2>

          <div className="space-y-2">
            <Label htmlFor="name">Server Name *</Label>
            <Input
              id="name"
              placeholder="My MCP Server"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Optional description"
              {...register('description')}
            />
          </div>
        </div>

        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="font-semibold">Connection Settings</h2>

          <div className="space-y-2">
            <Label htmlFor="url">Server URL *</Label>
            <Input
              id="url"
              placeholder="https://mcp.example.com"
              {...register('url')}
            />
            {errors.url && (
              <p className="text-sm text-red-500">{errors.url.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="wsUrl">WebSocket URL</Label>
            <Input
              id="wsUrl"
              placeholder="wss://mcp.example.com (optional)"
              {...register('wsUrl')}
            />
            {errors.wsUrl && (
              <p className="text-sm text-red-500">{errors.wsUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="masterToken">Master Token *</Label>
            <Input
              id="masterToken"
              type="password"
              placeholder="Enter master token"
              {...register('masterToken')}
            />
            {errors.masterToken && (
              <p className="text-sm text-red-500">{errors.masterToken.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The token will be encrypted before storage
            </p>
          </div>
        </div>

        <div className="space-y-4 p-6 border rounded-lg">
          <h2 className="font-semibold">Options</h2>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoConnect"
              {...register('autoConnect')}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="autoConnect" className="font-normal">
              Auto-connect on startup
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              {...register('isDefault')}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isDefault" className="font-normal">
              Set as default server
            </Label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/servers')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Server
          </Button>
        </div>
      </form>
    </div>
  );
}
