import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Role } from '../entities/user.entity';
import { PermissionName } from '../entities/permission.entity';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @Permissions(PermissionName.VIEW_PERMISSIONS)
  async getAllPermissions() {
    return this.permissionsService.getAllPermissions();
  }

  @Get('users')
  @Permissions(PermissionName.VIEW_PERMISSIONS)
  async getUsersWithPermissions() {
    return this.permissionsService.getUsersWithPermissions();
  }

  @Get('user/:userId')
  @Permissions(PermissionName.VIEW_PERMISSIONS)
  async getUserPermissions(@Param('userId') userId: string) {
    return this.permissionsService.getUserPermissions(userId);
  }

  @Put('user/:userId')
  @Permissions(PermissionName.MANAGE_PERMISSIONS)
  async updateUserPermissions(
    @Param('userId') userId: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.permissionsService.updateUserPermissions(userId, body.permissionIds);
  }
}















