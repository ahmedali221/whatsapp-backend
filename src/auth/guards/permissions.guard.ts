import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionName } from '../entities/permission.entity';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Role } from '../entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionName[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user: requestUser } = context.switchToHttp().getRequest();

    // SUPER_ADMIN has all permissions
    if (requestUser.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Load user with permissions
    const user = await this.userRepo.findOne({
      where: { id: requestUser.userId },
      relations: ['permissions'],
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Get user's permission names
    const userPermissions = user.permissions?.map((p) => p.name) || [];

    // Helper function to check if user has permission or view permission for the page
    const hasPermissionOrView = (requiredPermission: PermissionName): boolean => {
      // If user has the exact permission, allow
      if (userPermissions.includes(requiredPermission)) {
        return true;
      }

      // If user has VIEW permission for the page, allow all operations within that page
      // VIEW_USERS grants access to CREATE_USERS, EDIT_USERS, DELETE_USERS
      if (requiredPermission === PermissionName.CREATE_USERS || 
          requiredPermission === PermissionName.EDIT_USERS || 
          requiredPermission === PermissionName.DELETE_USERS) {
        return userPermissions.includes(PermissionName.VIEW_USERS);
      }

      // VIEW_PLANS grants access to CREATE_PLANS, EDIT_PLANS, DELETE_PLANS
      if (requiredPermission === PermissionName.CREATE_PLANS || 
          requiredPermission === PermissionName.EDIT_PLANS || 
          requiredPermission === PermissionName.DELETE_PLANS) {
        return userPermissions.includes(PermissionName.VIEW_PLANS);
      }

      // VIEW_MESSAGES grants access to SEND_MESSAGES, DELETE_MESSAGES
      if (requiredPermission === PermissionName.SEND_MESSAGES || 
          requiredPermission === PermissionName.DELETE_MESSAGES) {
        return userPermissions.includes(PermissionName.VIEW_MESSAGES);
      }

      // VIEW_PERMISSIONS grants access to MANAGE_PERMISSIONS
      if (requiredPermission === PermissionName.MANAGE_PERMISSIONS) {
        return userPermissions.includes(PermissionName.VIEW_PERMISSIONS);
      }

      // VIEW_SETTINGS grants access to EDIT_SETTINGS
      if (requiredPermission === PermissionName.EDIT_SETTINGS) {
        return userPermissions.includes(PermissionName.VIEW_SETTINGS);
      }

      return false;
    };

    // Check if user has all required permissions (either exact or through VIEW permission)
    const hasAllPermissions = requiredPermissions.every((permission) =>
      hasPermissionOrView(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}







