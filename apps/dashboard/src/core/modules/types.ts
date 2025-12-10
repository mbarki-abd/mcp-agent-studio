import type { ComponentType, LazyExoticComponent } from 'react';
import type { AppAbility } from '../auth';

// Route definition
export interface ModuleRoute {
  path: string;
  element: LazyExoticComponent<ComponentType> | ComponentType;
  layout?: 'default' | 'full' | 'minimal';
  permissions?: Array<{ action: string; subject: string }>;
  children?: ModuleRoute[];
}

// Navigation item
export interface NavigationItem {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  path: string;
  permissions?: Array<{ action: string; subject: string }>;
  badge?: () => number | string | null;
  children?: NavigationItem[];
}

// Module definition
export interface ModuleDefinition {
  id: string;
  name: string;
  version: string;
  description?: string;
  icon?: ComponentType<{ className?: string }>;
  dependencies?: string[];
  routes: ModuleRoute[];
  navigation?: NavigationItem[];
  permissions?: Array<{ action: string; subject: string }>;
  settings?: {
    configurable?: boolean;
    defaultEnabled?: boolean;
  };
  hooks?: {
    onInit?: (context: ModuleContext) => void | Promise<void>;
    onDestroy?: () => void;
  };
}

// Module context passed to hooks
export interface ModuleContext {
  ability: AppAbility;
  getModule: (id: string) => ModuleDefinition | undefined;
  isModuleEnabled: (id: string) => boolean;
}

// Module state
export interface ModuleState {
  id: string;
  enabled: boolean;
  loaded: boolean;
  error?: string;
}
