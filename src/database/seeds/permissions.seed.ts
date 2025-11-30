import { DataSource } from 'typeorm';
import { Permission, PermissionName } from '../../auth/entities/permission.entity';

const permissions = [
  // User Management
  {
    name: PermissionName.VIEW_USERS,
    description: 'View users list and details',
    category: 'Users',
  },
  {
    name: PermissionName.CREATE_USERS,
    description: 'Create new users',
    category: 'Users',
  },
  {
    name: PermissionName.EDIT_USERS,
    description: 'Edit existing users',
    category: 'Users',
  },
  {
    name: PermissionName.DELETE_USERS,
    description: 'Delete users',
    category: 'Users',
  },
  // Plan Management
  {
    name: PermissionName.VIEW_PLANS,
    description: 'View plans list and details',
    category: 'Plans',
  },
  {
    name: PermissionName.CREATE_PLANS,
    description: 'Create new plans',
    category: 'Plans',
  },
  {
    name: PermissionName.EDIT_PLANS,
    description: 'Edit existing plans',
    category: 'Plans',
  },
  {
    name: PermissionName.DELETE_PLANS,
    description: 'Delete plans',
    category: 'Plans',
  },
  // Message Management
  {
    name: PermissionName.VIEW_MESSAGES,
    description: 'View messages',
    category: 'Messages',
  },
  {
    name: PermissionName.SEND_MESSAGES,
    description: 'Send messages',
    category: 'Messages',
  },
  {
    name: PermissionName.DELETE_MESSAGES,
    description: 'Delete messages',
    category: 'Messages',
  },
  // Dashboard
  {
    name: PermissionName.VIEW_DASHBOARD,
    description: 'View dashboard',
    category: 'Dashboard',
  },
  // Permissions Management
  {
    name: PermissionName.VIEW_PERMISSIONS,
    description: 'View permissions',
    category: 'Permissions',
  },
  {
    name: PermissionName.MANAGE_PERMISSIONS,
    description: 'Manage user permissions',
    category: 'Permissions',
  },
  // Settings
  {
    name: PermissionName.VIEW_SETTINGS,
    description: 'View settings',
    category: 'Settings',
  },
  {
    name: PermissionName.EDIT_SETTINGS,
    description: 'Edit settings',
    category: 'Settings',
  },
];

export async function seedPermissions(dataSource: DataSource) {
  const permissionRepo = dataSource.getRepository(Permission);

  for (const perm of permissions) {
    const existing = await permissionRepo.findOne({ where: { name: perm.name } });
    if (!existing) {
      const permission = permissionRepo.create(perm);
      await permissionRepo.save(permission);
      console.log(`✓ Created permission: ${perm.name}`);
    } else {
      console.log(`- Permission already exists: ${perm.name}`);
    }
  }

  console.log('Permissions seeding completed!');
}



