import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Package } from './entities/package.entity';
import { Subscription, SubscriptionStatus, PaymentStatus } from './entities/subscription.entity';
import { User } from '../auth/entities/user.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private packageRepo: Repository<Package>,
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  // ========== Package Management (Admin Only) ==========

  async createPackage(createPackageDto: CreatePackageDto) {
    const pkg = this.packageRepo.create(createPackageDto);
    await this.packageRepo.save(pkg);
    return { message: 'Package created successfully', package: pkg };
  }

  async getAllPackages() {
    return this.packageRepo.find({ where: { isActive: true }, order: { price: 'ASC' } });
  }

  async getPackageById(id: string) {
    const pkg = await this.packageRepo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  async updatePackage(id: string, updatePackageDto: UpdatePackageDto) {
    const pkg = await this.getPackageById(id);
    Object.assign(pkg, updatePackageDto);
    await this.packageRepo.save(pkg);
    return { message: 'Package updated successfully', package: pkg };
  }

  async deletePackage(id: string) {
    const pkg = await this.getPackageById(id);
    pkg.isActive = false;
    await this.packageRepo.save(pkg);
    return { message: 'Package deactivated successfully' };
  }

  // ========== Subscription Management (User) ==========

  async subscribe(userId: string, packageId: string) {
    const pkg = await this.getPackageById(packageId);
    if (!pkg.isActive) throw new BadRequestException('Package is not available');

    const activeSubscription = await this.subscriptionRepo.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: MoreThan(new Date()),
      },
    });

    if (activeSubscription) {
      throw new ConflictException('You already have an active subscription');
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
      paymentStatus: PaymentStatus.PAID, 
    });

    await this.subscriptionRepo.save(subscription);

    await this.userRepo.update(userId, { currentSubscriptionId: subscription.id });

    return {
      message: 'Subscribed successfully',
      subscription: {
        id: subscription.id,
        package: pkg.name,
        messagesLimit: subscription.messagesLimit,
        messagesRemaining: subscription.messagesRemaining,
        charactersLimit: subscription.charactersLimit,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
    };
  }

  async getCurrentSubscription(userId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });

    if (!subscription) {
      return { message: 'No active subscription found' };
    }

    if (new Date() > subscription.endDate) {
      subscription.status = SubscriptionStatus.EXPIRED;
      await this.subscriptionRepo.save(subscription);
      await this.userRepo.update(userId, { currentSubscriptionId: null });
      return { message: 'Your subscription has expired' };
    }

    return {
      id: subscription.id,
      package: subscription.package.name,
      messagesLimit: subscription.messagesLimit,
      messagesUsed: subscription.messagesUsed,
      messagesRemaining: subscription.messagesRemaining,
      charactersLimit: subscription.charactersLimit,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
    };
  }

  async getSubscriptionHistory(userId: string) {
    return this.subscriptionRepo.find({
      where: { userId },
      relations: ['package'],
      order: { createdAt: 'DESC' },
    });
  }

  // ========== Helper: Decrement Messages ==========

  async decrementMessage(userId: string) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      throw new BadRequestException('No active subscription');
    }

    if (subscription.messagesRemaining <= 0) {
      throw new BadRequestException('No messages remaining in your subscription');
    }

    subscription.messagesUsed += 1;
    subscription.messagesRemaining -= 1;
    await this.subscriptionRepo.save(subscription);

    return subscription;
  }
}
