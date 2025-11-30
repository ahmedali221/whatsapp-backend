import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission, PermissionName } from '../entities/permission.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepo: Repository<Permission>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getAllPermissions() {
    return this.permissionRepo.find({
      order: { category: 'ASC', name: 'ASC' },
    });
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
    return this.userRepo.find({
      where: { role: 'ADMIN' },
      relations: ['permissions'],
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });
  }
}

