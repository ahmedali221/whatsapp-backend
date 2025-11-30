import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../auth/entities/user.entity';
import { Subscription, SubscriptionStatus } from '../packages/entities/subscription.entity';
import { Contact } from '../contacts/entities/contact.entity';
import { Message, MessageStatus } from '../whatsapp/entities/message.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
    @InjectRepository(Message)
    private messageRepo: Repository<Message>,
  ) {}

  async incrementMessagesSent(userId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
  
    if (subscription) {
      subscription.messagesUsed += 1;
      subscription.messagesRemaining -= 1;
      await this.subscriptionRepo.save(subscription);
    }
  }

  async getUserDashboard(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentSubscription = await this.subscriptionRepo.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: MoreThan(new Date()),
      },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });

    const allSubscriptions = await this.subscriptionRepo.find({
      where: { userId },
    });

    const totalMessagesSent = allSubscriptions.reduce(
      (sum, sub) => sum + sub.messagesUsed,
      0
    );

    const totalContactsUploaded = await this.contactRepo.count({ where: { userId }});

    const dashboard = {
      user: {
        name: user.name,
        email: user.email,
        memberSince: user.createdAt,
      },
      statistics: {
        totalMessagesSent,
        totalContactsUploaded,
      },
      currentSubscription: null as any,
    };

    if (currentSubscription) {
      const isExpired = new Date() > currentSubscription.endDate;

      if (isExpired) {
        currentSubscription.status = SubscriptionStatus.EXPIRED;
        await this.subscriptionRepo.save(currentSubscription);
      }

      dashboard.currentSubscription = {
        package: {
          name: currentSubscription.package.name,
          description: currentSubscription.package.description,
        },
        messagesLimit: currentSubscription.messagesLimit,
        messagesUsed: currentSubscription.messagesUsed,
        messagesRemaining: currentSubscription.messagesRemaining,
        charactersLimit: currentSubscription.charactersLimit,
        startDate: currentSubscription.startDate,
        endDate: currentSubscription.endDate,
        status: isExpired ? SubscriptionStatus.EXPIRED : currentSubscription.status,
        daysRemaining: this.calculateDaysRemaining(currentSubscription.endDate),
        usagePercentage: this.calculateUsagePercentage(
          currentSubscription.messagesUsed,
          currentSubscription.messagesLimit
        ),
      };
    } else {
      dashboard.currentSubscription = {
        status: 'NO_SUBSCRIPTION',
        message: 'You do not have an active subscription. Please subscribe to a package to start sending messages.',
      };
    }

    return dashboard;
  }

  async getAdminDashboard() {
    const totalUsers = await this.userRepo.count();
    
    const activeSubscriptions = await this.subscriptionRepo.count({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: MoreThan(new Date()),
      },
    });

    const expiredSubscriptions = await this.subscriptionRepo.count({
      where: { status: SubscriptionStatus.EXPIRED },
    });

    const allSubscriptions = await this.subscriptionRepo.find();
    const totalMessagesSent = allSubscriptions.reduce(
      (sum, sub) => sum + sub.messagesUsed,
      0
    );

    // Calculate average characters per message
    // Using efficient query that works across different databases
    let averageCharactersPerMessage = 0;
    const sentMessagesCount = await this.messageRepo.count({
      where: { status: MessageStatus.SENT },
    });

    if (sentMessagesCount > 0) {
      try {
        // Use PostgreSQL's LENGTH() function for efficient calculation
        const result = await this.messageRepo
          .createQueryBuilder('message')
          .select('AVG(LENGTH(message.message))', 'avgLength')
          .where('message.status = :status', { status: MessageStatus.SENT })
          .getRawOne();
        
        if (result?.avgLength) {
          averageCharactersPerMessage = Math.round(parseFloat(result.avgLength));
        }
      } catch (error) {
        // Fallback: calculate manually using a sample if SQL fails
        // This is more memory-efficient than loading all messages
        const sentMessages = await this.messageRepo.find({
          where: { status: MessageStatus.SENT },
          select: ['message'],
          take: Math.min(10000, sentMessagesCount), // Sample up to 10k messages
        });

        if (sentMessages.length > 0) {
          const totalCharacters = sentMessages.reduce(
            (sum, msg) => sum + (msg.message?.length || 0),
            0
          );
          averageCharactersPerMessage = Math.round(totalCharacters / sentMessages.length);
        }
      }
    }

    // Count failed messages
    const failedMessages = await this.messageRepo.count({
      where: { status: MessageStatus.FAILED },
    });

    const totalRevenue = allSubscriptions
      .filter(sub => sub.paymentStatus === 'PAID')
      .reduce((sum, sub) => {
        // TODO: إضافة price في Subscription entity
        return sum;
      }, 0);

    return {
      statistics: {
        totalUsers,
        activeSubscriptions,
        expiredSubscriptions,
        totalMessagesSent,
        failedMessages,
        averageCharactersPerMessage,
        totalRevenue, // TODO: سيتم حسابه بشكل صحيح لاحقًا
      },
      recentSubscriptions: await this.getRecentSubscriptions(),
    };
  }

  private async getRecentSubscriptions(limit: number = 10) {
    return this.subscriptionRepo.find({
      relations: ['user', 'package'],
      order: { createdAt: 'DESC' },
      take: limit,
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        messagesUsed: true,
        messagesRemaining: true,
        createdAt: true,
        user: {
          id: true,
          name: true,
          email: true,
        },
        package: {
          id: true,
          name: true,
          price: true,
        },
      },
    });
  }

  private calculateDaysRemaining(endDate: Date): number {
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  private calculateUsagePercentage(used: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  }
}
