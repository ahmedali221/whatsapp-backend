import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User } from '../auth/entities/user.entity';
import { Subscription } from '../packages/entities/subscription.entity';
import { Contact } from 'src/contacts/entities/contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Subscription , Contact])],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
