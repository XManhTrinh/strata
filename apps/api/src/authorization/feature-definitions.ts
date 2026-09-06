import { FeatureDefinition } from './feature-registry/feature-registry.types';

/**
 * Built-in feature definitions for all active modules.
 * These are registered at application startup by the FeatureRegistryBootstrap.
 */
export const BUILT_IN_FEATURES: FeatureDefinition[] = [
  {
    key: 'org_chart',
    displayName: 'Organization Chart',
    description: 'Visual hierarchy of teams, reporting lines, and org units',
    permissions: [
      { key: 'view', displayName: 'View Org Chart', description: 'View the organizational chart' },
      { key: 'manage', displayName: 'Manage Org Chart', description: 'Reparent people and manage reporting lines' },
    ],
  },
  {
    key: 'people',
    displayName: 'People',
    description: 'People directory and personal records',
    permissions: [
      { key: 'view', displayName: 'View People', description: 'View people records' },
      { key: 'create', displayName: 'Create Person', description: 'Create people records' },
      { key: 'update', displayName: 'Update Person', description: 'Update people records' },
      { key: 'delete', displayName: 'Delete Person', description: 'Delete people records' },
    ],
  },
  {
    key: 'budgeting',
    displayName: 'Budgeting',
    description: 'Department budgeting and financial planning',
    permissions: [
      { key: 'view', displayName: 'View Budgets', description: 'View budget data' },
      { key: 'manage', displayName: 'Manage Budgets', description: 'Create and manage budgets' },
    ],
  },
  {
    key: 'authorization',
    displayName: 'Authorization',
    description: 'Authorization system management',
    permissions: [
      { key: 'manage_roles', displayName: 'Manage Roles', description: 'Create and manage roles' },
      { key: 'manage_org_structure', displayName: 'Manage Org Structure', description: 'Manage organization units and types' },
      { key: 'manage_positions', displayName: 'Manage Positions', description: 'Manage position definitions' },
      { key: 'manage_features', displayName: 'Manage Features', description: 'Enable/disable features' },
      { key: 'manage_reporting', displayName: 'Manage Reporting', description: 'Manage reporting hierarchy' },
      { key: 'view_permissions', displayName: 'View Permissions', description: 'View permission configurations' },
    ],
  },
  {
    key: 'calendar',
    displayName: 'Calendar & Leave',
    description: 'Calendar events and leave management',
    permissions: [
      { key: 'view', displayName: 'View Calendar', description: 'View calendar events' },
      { key: 'manage', displayName: 'Manage Calendar', description: 'Create and manage calendar events' },
    ],
  },
  {
    key: 'dashboard',
    displayName: 'Dashboard',
    description: 'Overview dashboard with key metrics',
    permissions: [
      { key: 'view', displayName: 'View Dashboard', description: 'View dashboard data' },
    ],
  },
  {
    key: 'capacity',
    displayName: 'Capacity Planning',
    description: 'Team capacity allocation and resource planning',
    permissions: [
      { key: 'view', displayName: 'View Capacity', description: 'View capacity allocations' },
      { key: 'manage', displayName: 'Manage Capacity', description: 'Manage capacity allocations' },
    ],
  },
];
