import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Subscription, SubscriptionStatus } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const subscription = await this.subscriptionRepo.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: MoreThan(new Date()),
      },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription found. Please subscribe to a package first.');
    }

    if (new Date() > subscription.endDate) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepo.save(subscription);
      throw new BadRequestException('Your subscription has expired. Please renew your subscription.');
    }

    if (subscription.messagesRemaining <= 0) {
      throw new BadRequestException(
        `You have used all ${subscription.messagesLimit} messages in your subscription. Please upgrade your package.`
      );
    }

    request.subscription = subscription;

    return true;
  }
}
