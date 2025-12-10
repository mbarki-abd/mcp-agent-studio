import type { ModuleDefinition, ModuleState, ModuleContext, NavigationItem } from './types';
import type { AppAbility } from '../auth';

class ModuleRegistry {
  private modules: Map<string, ModuleDefinition> = new Map();
  private states: Map<string, ModuleState> = new Map();
  private listeners: Set<() => void> = new Set();

  register(module: ModuleDefinition): void {
    if (this.modules.has(module.id)) {
      console.warn(`Module ${module.id} is already registered`);
      return;
    }

    // Check dependencies
    if (module.dependencies) {
      for (const dep of module.dependencies) {
        if (!this.modules.has(dep)) {
          console.warn(`Module ${module.id} depends on ${dep} which is not registered`);
        }
      }
    }

    this.modules.set(module.id, module);
    this.states.set(module.id, {
      id: module.id,
      enabled: module.settings?.defaultEnabled ?? true,
      loaded: false,
    });

    this.notifyListeners();
  }

  unregister(moduleId: string): void {
    // Check if other modules depend on this
    for (const [id, mod] of this.modules) {
      if (mod.dependencies?.includes(moduleId)) {
        console.warn(`Cannot unregister ${moduleId}: ${id} depends on it`);
        return;
      }
    }

    const module = this.modules.get(moduleId);
    if (module?.hooks?.onDestroy) {
      module.hooks.onDestroy();
    }

    this.modules.delete(moduleId);
    this.states.delete(moduleId);
    this.notifyListeners();
  }

  getModule(id: string): ModuleDefinition | undefined {
    return this.modules.get(id);
  }

  getAllModules(): ModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  getState(id: string): ModuleState | undefined {
    return this.states.get(id);
  }

  isEnabled(id: string): boolean {
    return this.states.get(id)?.enabled ?? false;
  }

  setEnabled(id: string, enabled: boolean): void {
    const state = this.states.get(id);
    if (state) {
      state.enabled = enabled;
      this.notifyListeners();
    }
  }

  async initializeModule(id: string, context: ModuleContext): Promise<void> {
    const module = this.modules.get(id);
    const state = this.states.get(id);

    if (!module || !state) {
      throw new Error(`Module ${id} not found`);
    }

    if (state.loaded) {
      return;
    }

    // Initialize dependencies first
    if (module.dependencies) {
      for (const dep of module.dependencies) {
        await this.initializeModule(dep, context);
      }
    }

    try {
      if (module.hooks?.onInit) {
        await module.hooks.onInit(context);
      }
      state.loaded = true;
      state.error = undefined;
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Failed to initialize module';
      throw error;
    }

    this.notifyListeners();
  }

  // Get all routes from enabled modules
  getRoutes(): ModuleDefinition['routes'] {
    const routes: ModuleDefinition['routes'] = [];

    for (const module of this.modules.values()) {
      if (this.isEnabled(module.id)) {
        routes.push(...module.routes);
      }
    }

    return routes;
  }

  // Get navigation items from enabled modules, filtered by ability
  getNavigation(ability: AppAbility): NavigationItem[] {
    const items: NavigationItem[] = [];

    for (const module of this.modules.values()) {
      if (!this.isEnabled(module.id) || !module.navigation) {
        continue;
      }

      for (const navItem of module.navigation) {
        // Check permissions
        if (navItem.permissions) {
          const hasPermission = navItem.permissions.every(
            p => ability.can(p.action as never, p.subject as never)
          );
          if (!hasPermission) continue;
        }

        // Filter children by permission
        const filteredItem = { ...navItem };
        if (navItem.children) {
          filteredItem.children = navItem.children.filter(child => {
            if (!child.permissions) return true;
            return child.permissions.every(
              p => ability.can(p.action as never, p.subject as never)
            );
          });
        }

        items.push(filteredItem);
      }
    }

    return items;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const moduleRegistry = new ModuleRegistry();
