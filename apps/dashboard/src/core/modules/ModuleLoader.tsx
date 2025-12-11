import { Suspense, useEffect, useState, useMemo, type ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { moduleRegistry } from './ModuleRegistry';
import { useAbility, useAuth } from '../auth';
import type { ModuleRoute, ModuleContext } from './types';

// Loading fallback
function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

// Permission guard component
function PermissionGuard({
  permissions,
  children,
}: {
  permissions?: Array<{ action: string; subject: string }>;
  children: ReactNode;
}) {
  const ability = useAbility();

  if (!permissions || permissions.length === 0) {
    return <>{children}</>;
  }

  const hasPermission = permissions.every(p =>
    ability.can(p.action as never, p.subject as never)
  );

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-gray-500">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Render a single route
function renderRoute(route: ModuleRoute): ReactNode {
  const Element = route.element;

  return (
    <Route
      key={route.path}
      path={route.path}
      element={
        <PermissionGuard permissions={route.permissions}>
          <Suspense fallback={<LoadingFallback />}>
            <Element />
          </Suspense>
        </PermissionGuard>
      }
    >
      {route.children?.map(child => renderRoute(child))}
    </Route>
  );
}

interface ModuleLoaderProps {
  children?: ReactNode;
}

export function ModuleLoader({ children }: ModuleLoaderProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const ability = useAbility();
  const [initialized, setInitialized] = useState(false);
  const [, forceUpdate] = useState(0);

  // Subscribe to registry changes
  useEffect(() => {
    return moduleRegistry.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  // Initialize modules when authenticated
  useEffect(() => {
    if (authLoading || !isAuthenticated) {
      setInitialized(false);
      return;
    }

    const context: ModuleContext = {
      ability,
      getModule: (id) => moduleRegistry.getModule(id),
      isModuleEnabled: (id) => moduleRegistry.isEnabled(id),
    };

    // Initialize all enabled modules
    const initModules = async () => {
      for (const module of moduleRegistry.getAllModules()) {
        if (moduleRegistry.isEnabled(module.id)) {
          try {
            await moduleRegistry.initializeModule(module.id, context);
          } catch (error) {
            console.error(`Failed to initialize module ${module.id}:`, error);
          }
        }
      }
      setInitialized(true);
    };

    initModules();
  }, [isAuthenticated, authLoading, ability]);

  // Get routes from all enabled modules
  const routes = useMemo(() => {
    // Always return routes, even before initialization
    // This prevents the fallback redirect from happening too early
    return moduleRegistry.getRoutes();
  }, [initialized]); // Still depend on initialized to trigger re-render

  if (authLoading || !initialized) {
    return <LoadingFallback />;
  }

  return (
    <Routes>
      {/* Module routes */}
      {routes.map(route => renderRoute(route))}

      {/* Fallback/children routes */}
      {children}

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Hook to get navigation items
export function useModuleNavigation() {
  const ability = useAbility();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return moduleRegistry.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  return moduleRegistry.getNavigation(ability);
}

// Hook to check if a module is enabled
export function useModuleEnabled(moduleId: string): boolean {
  const [enabled, setEnabled] = useState(() => moduleRegistry.isEnabled(moduleId));

  useEffect(() => {
    return moduleRegistry.subscribe(() => {
      setEnabled(moduleRegistry.isEnabled(moduleId));
    });
  }, [moduleId]);

  return enabled;
}
