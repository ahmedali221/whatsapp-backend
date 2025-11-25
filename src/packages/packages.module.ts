import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { Package } from './entities/package.entity';
import { Subscription } from './entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import { SubscriptionGuard } from './guards/subscription.guard';
import { MessageLengthInterceptor } from './interceptors/message-length.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Package, Subscription, User])],
  controllers: [PackagesController],
  providers: [
    PackagesService,
    SubscriptionGuard,
    MessageLengthInterceptor,
  ],
  exports: [PackagesService, SubscriptionGuard, MessageLengthInterceptor],
})
export class PackagesModule {}
