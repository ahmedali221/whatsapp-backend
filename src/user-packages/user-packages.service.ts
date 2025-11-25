import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Subscription, SubscriptionStatus, PaymentStatus } from '../packages/entities/subscription.entity';
import { Package } from '../packages/entities/package.entity';
import { User } from '../auth/entities/user.entity';
import { SubscribePackageDto } from './dto/subscribe-package.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Injectable()
export class UserPackagesService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Package)
    private packageRepo: Repository<Package>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Subscribe a user to a package
   */
  async subscribeToPackage(userId: string, subscribeDto: SubscribePackageDto) {
    const pkg = await this.packageRepo.findOne({ where: { id: subscribeDto.packageId } });
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }
    if (!pkg.isActive) {
      throw new BadRequestException('Package is not available');
    }

    // Check for existing active subscription
    const activeSubscription = await this.subscriptionRepo.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: MoreThan(new Date()),
      },
    });

    if (activeSubscription) {
      throw new BadRequestException('You already have an active subscription');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + pkg.durationDays);

    const subscription = this.subscriptionRepo.create({
      userId,
      packageId: pkg.id,
      messagesLimit: pkg.messagesLimit,
      messagesUsed: 0,
      messagesRemaining: pkg.messagesLimit,
      charactersLimit: pkg.charactersLimit,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
      paymentStatus: subscribeDto.paymentStatus || PaymentStatus.PENDING,
    });

    await this.subscriptionRepo.save(subscription);

    // Update user's current subscription
    await this.userRepo.update(userId, { currentSubscriptionId: subscription.id });

    return {
      message: 'Subscribed to package successfully',
      subscription: {
        id: subscription.id,
        package: {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description,
        },
        messagesLimit: subscription.messagesLimit,
        messagesUsed: subscription.messagesUsed,
        messagesRemaining: subscription.messagesRemaining,
        charactersLimit: subscription.charactersLimit,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
      },
    };
  }

  /**
   * Get user's current active subscription
   */
  async getCurrentSubscription(userId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      return { message: 'No active subscription found', subscription: null };
    }

    // Check if subscription has expired
    if (new Date() > subscription.endDate) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepo.save(subscription);
      await this.userRepo.update(userId, { currentSubscriptionId: null });
      return { message: 'Your subscription has expired', subscription: null };
    }

    return {
      subscription: {
        id: subscription.id,
        package: {
          id: subscription.package.id,
          name: subscription.package.name,
          description: subscription.package.description,
          price: subscription.package.price,
          currency: subscription.package.currency,
        },
        messagesLimit: subscription.messagesLimit,
        messagesUsed: subscription.messagesUsed,
        messagesRemaining: subscription.messagesRemaining,
        charactersLimit: subscription.charactersLimit,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
      },
    };
  }

  /**
   * Get all user's subscriptions (history)
   */
  async getUserSubscriptions(userId: string) {
    const subscriptions = await this.subscriptionRepo.find({
      where: { userId },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });

    return {
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        package: {
          id: sub.package.id,
          name: sub.package.name,
          description: sub.package.description,
        },
        messagesLimit: sub.messagesLimit,
        messagesUsed: sub.messagesUsed,
        messagesRemaining: sub.messagesRemaining,
        charactersLimit: sub.charactersLimit,
        startDate: sub.startDate,
        endDate: sub.endDate,
        status: sub.status,
        paymentStatus: sub.paymentStatus,
        createdAt: sub.createdAt,
      })),
    };
  }

  /**
   * Get subscription by ID (for the user)
   */
  async getSubscriptionById(userId: string, subscriptionId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, userId },
      relations: ['package'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return {
      subscription: {
        id: subscription.id,
        package: {
          id: subscription.package.id,
          name: subscription.package.name,
          description: subscription.package.description,
          price: subscription.package.price,
          currency: subscription.package.currency,
        },
        messagesLimit: subscription.messagesLimit,
        messagesUsed: subscription.messagesUsed,
        messagesRemaining: subscription.messagesRemaining,
        charactersLimit: subscription.charactersLimit,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
      },
    };
  }

  /**
   * Update subscription (e.g., payment status)
   */
  async updateSubscription(userId: string, subscriptionId: string, updateDto: UpdateSubscriptionDto) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (updateDto.paymentStatus) {
      subscription.paymentStatus = updateDto.paymentStatus;
    }

    if (updateDto.status) {
      subscription.status = updateDto.status;
    }

    await this.subscriptionRepo.save(subscription);

    return {
      message: 'Subscription updated successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        paymentStatus: subscription.paymentStatus,
      },
    };
  }

  /**
   * Cancel user's subscription
   */
  async cancelSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    subscription.status = SubscriptionStatus.CANCELLED;
    await this.subscriptionRepo.save(subscription);

    // If this was the current subscription, clear it from user
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user?.currentSubscriptionId === subscriptionId) {
      await this.userRepo.update(userId, { currentSubscriptionId: null });
    }

    return {
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
      },
    };
  }

  /**
   * Get user's package usage statistics
   */
  async getUsageStatistics(userId: string) {
    const currentSubscription = await this.subscriptionRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['package'],
    });

    if (!currentSubscription) {
      return {
        message: 'No active subscription found',
        statistics: null,
      };
    }

    const usagePercentage = (currentSubscription.messagesUsed / currentSubscription.messagesLimit) * 100;
    const daysRemaining = Math.ceil(
      (currentSubscription.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      statistics: {
        subscriptionId: currentSubscription.id,
        packageName: currentSubscription.package.name,
        messagesLimit: currentSubscription.messagesLimit,
        messagesUsed: currentSubscription.messagesUsed,
        messagesRemaining: currentSubscription.messagesRemaining,
        usagePercentage: Math.round(usagePercentage * 100) / 100,
        charactersLimit: currentSubscription.charactersLimit,
        startDate: currentSubscription.startDate,
        endDate: currentSubscription.endDate,
        daysRemaining: daysRemaining > 0 ? daysRemaining : 0,
        status: currentSubscription.status,
      },
    };
  }
}

