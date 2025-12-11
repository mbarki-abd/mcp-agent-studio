import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Server, Link, Key, Info } from 'lucide-react';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { useWizard } from './WizardContext';

const schema = z.object({
  name: z.string().min(1, 'Server name is required').max(100),
  description: z.string().max(500).optional(),
  url: z.string().url('Must be a valid URL'),
  masterToken: z.string().min(1, 'Master token is required'),
  autoConnect: z.boolean(),
  isDefault: z.boolean(),
});

type FormData = z.infer<typeof schema>;

export function Step1Basics() {
  const { data, updateData, setCanProceed } = useWizard();

  const {
    register,
    watch,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      name: data.name,
      description: data.description,
      url: data.url,
      masterToken: data.masterToken,
      autoConnect: data.autoConnect,
      isDefault: data.isDefault,
    },
  });

  const formValues = watch();

  useEffect(() => {
    updateData(formValues);
    setCanProceed(isValid);
  }, [formValues, isValid, updateData, setCanProceed]);

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Server className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Server Information</h2>
        <p className="text-muted-foreground mt-1">
          Enter the basic details for your MCP server
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <Server className="w-4 h-4" />
            Server Name *
          </Label>
          <Input
            id="name"
            placeholder="My MCP Server"
            {...register('name')}
            className={errors.name ? 'border-red-500' : ''}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Description
          </Label>
          <Input
            id="description"
            placeholder="Optional description of this server"
            {...register('description')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="url" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            Server URL *
          </Label>
          <Input
            id="url"
            placeholder="https://mcp.example.com"
            {...register('url')}
            className={errors.url ? 'border-red-500' : ''}
          />
          {errors.url && (
            <p className="text-sm text-red-500">{errors.url.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            The base URL of your MCP server (including port if needed)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="masterToken" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Master Token *
          </Label>
          <Input
            id="masterToken"
            type="password"
            placeholder="Enter master token"
            {...register('masterToken')}
            className={errors.masterToken ? 'border-red-500' : ''}
          />
          {errors.masterToken && (
            <p className="text-sm text-red-500">{errors.masterToken.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            The authentication token will be encrypted before storage
          </p>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoConnect"
              {...register('autoConnect')}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="autoConnect" className="font-normal cursor-pointer">
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
            <Label htmlFor="isDefault" className="font-normal cursor-pointer">
              Set as default server
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
