import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPackagesService } from './user-packages.service';
import { UserPackagesController } from './user-packages.controller';
import { Subscription } from '../packages/entities/subscription.entity';
import { Package } from '../packages/entities/package.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subscription, Package, User])],
  controllers: [UserPackagesController],
  providers: [UserPackagesService],
  exports: [UserPackagesService],
})
export class UserPackagesModule {}

