import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Permission, PermissionName } from '../entities/permission.entity';
import { User, Role } from '../entities/user.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getAllPermissions() {
    // Return only page permissions (VIEW_*)
    const pagePermissionNames = [
      PermissionName.VIEW_DASHBOARD,
      PermissionName.VIEW_USERS,
      PermissionName.VIEW_PLANS,
      PermissionName.VIEW_MESSAGES,
      PermissionName.VIEW_PERMISSIONS,
    ];
    
    return this.permissionRepo.find({
      where: {
        name: In(pagePermissionNames),
      },
      order: { name: 'ASC' },
    });
  }

  async seedPermissions() {
    const pagePermissions = [
      {
        name: PermissionName.VIEW_DASHBOARD,
        description: 'Access to Dashboard page',
        category: 'Pages',
      },
      {
        name: PermissionName.VIEW_USERS,
        description: 'Access to Users management page',
        category: 'Pages',
      },
      {
        name: PermissionName.VIEW_PLANS,
        description: 'Access to Plans management page',
        category: 'Pages',
      },
      {
        name: PermissionName.VIEW_MESSAGES,
        description: 'Access to Messages page',
        category: 'Pages',
      },
      {
        name: PermissionName.VIEW_PERMISSIONS,
        description: 'Access to Permissions management page',
        category: 'Pages',
      },
    ];

    for (const permData of pagePermissions) {
      const existingPermission = await this.permissionRepo.findOne({
        where: { name: permData.name },
      });

      if (!existingPermission) {
        const permission = this.permissionRepo.create(permData);
        await this.permissionRepo.save(permission);
        console.log(`✅ Created permission: ${permData.name}`);
      } else {
        // Update existing permission to ensure category is set
        if (existingPermission.category !== permData.category || existingPermission.description !== permData.description) {
          existingPermission.category = permData.category;
          existingPermission.description = permData.description;
          await this.permissionRepo.save(existingPermission);
          console.log(`🔄 Updated permission: ${permData.name}`);
        }
      }
    }

    console.log('✅ Permissions seeding completed');
  }

  async getUserPermissions(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['permissions'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.permissions || [];
  }

  async updateUserPermissions(userId: string, permissionIds: string[]) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['permissions'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent modifying Super Admin permissions
    if (user.role === Role.SUPER_ADMIN) {
      throw new BadRequestException('Cannot modify permissions for Super Admin. Super Admin has all permissions automatically.');
    }

    const permissions = await this.permissionRepo.find({
      where: permissionIds.map((id) => ({ id })),
    });
    
    user.permissions = permissions;
    await this.userRepo.save(user);

    return {
      message: 'User permissions updated successfully',
      permissions: permissions.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
      })),
    };
  }

  async getUsersWithPermissions() {
    // Get both ADMIN and SUPER_ADMIN users (Super Admin can manage all)
    return this.userRepo.find({
      where: [{ role: Role.ADMIN }, { role: Role.SUPER_ADMIN }],
      relations: ['permissions'],
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });
  }
}

