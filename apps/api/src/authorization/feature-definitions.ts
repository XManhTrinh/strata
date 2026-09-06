import { FeatureDefinition } from './feature-registry/feature-registry.types';

/**
 * Built-in feature definitions for all existing modules.
 * These are registered at application startup by the FeatureRegistryBootstrap.
 *
 * Instead of modifying each existing module file with @RegisterFeature decorators
 * (which would break existing tests), we maintain a centralized registry of
 * built-in features that the bootstrap can process.
 */
export const BUILT_IN_FEATURES: FeatureDefinition[] = [
  {
    key: 'employees',
    displayName: 'Employees',
    description: 'Employee management and HR data',
    permissions: [
      { key: 'view', displayName: 'View Employees', description: 'View employee records' },
      { key: 'create', displayName: 'Create Employee', description: 'Create new employee records' },
      { key: 'update', displayName: 'Update Employee', description: 'Update employee records' },
      { key: 'delete', displayName: 'Delete Employee', description: 'Delete employee records' },
    ],
  },
  {
    key: 'organizations',
    displayName: 'Organizations',
    description: 'Organization structure management',
    permissions: [
      { key: 'view', displayName: 'View Organizations', description: 'View organization details' },
      { key: 'manage', displayName: 'Manage Organizations', description: 'Create and update organizations' },
    ],
  },
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
    key: 'capacity',
    displayName: 'Capacity',
    description: 'Team capacity allocation management',
    permissions: [
      { key: 'view', displayName: 'View Capacity', description: 'View capacity allocations' },
      { key: 'manage', displayName: 'Manage Capacity', description: 'Manage capacity allocations' },
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
    key: 'notifications',
    displayName: 'Notifications',
    description: 'User notifications system',
    permissions: [
      { key: 'view', displayName: 'View Notifications', description: 'View notifications' },
      { key: 'manage', displayName: 'Manage Notifications', description: 'Send and manage notifications' },
    ],
  },
  {
    key: 'reports',
    displayName: 'Reports',
    description: 'Reporting and analytics',
    permissions: [
      { key: 'view', displayName: 'View Reports', description: 'View and generate reports' },
      { key: 'manage', displayName: 'Manage Reports', description: 'Manage report configurations' },
    ],
  },
  {
    key: 'search',
    displayName: 'Search',
    description: 'Global search functionality',
    permissions: [
      { key: 'use', displayName: 'Use Search', description: 'Use search functionality' },
    ],
  },
  {
    key: 'audit',
    displayName: 'Audit',
    description: 'Audit log viewing and management',
    permissions: [
      { key: 'view', displayName: 'View Audit Logs', description: 'View audit trail records' },
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
];
