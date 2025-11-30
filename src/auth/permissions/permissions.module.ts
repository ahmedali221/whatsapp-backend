import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsGuard } from '../guards/permissions.guard';
import { Permission } from '../entities/permission.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, User])],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService, PermissionsGuard],
})
export class PermissionsModule {}

