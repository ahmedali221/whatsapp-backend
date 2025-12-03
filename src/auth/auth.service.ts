import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, Role } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { Subscription, SubscriptionStatus } from '../packages/entities/subscription.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { name, email, password, phoneNumber } = registerDto;

    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      name,
      email,
      phoneNumber: phoneNumber || null,
      password: hashedPassword,
    });
    await this.userRepo.save(user);

    return {
      message: 'User registered successfully',
      user: { id: user.id, name: user.name, email: user.email, phoneNumber: user.phoneNumber },
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepo.findOne({ 
      where: { email },
      relations: ['permissions'],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const userPermissions = user.permissions?.map((p) => p.name) || [];
    
    // Log admin permissions
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      console.log(`\n🔐 Admin Login: ${user.email} (${user.role})`);
      console.log(`📋 Permissions: ${userPermissions.length > 0 ? userPermissions.join(', ') : 'No permissions assigned'}`);
      console.log(`👤 User ID: ${user.id}\n`);
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        permissions: userPermissions,
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['permissions'],
      select: ['id', 'name', 'email', 'phoneNumber', 'role', 'currentSubscriptionId', 'createdAt'],
    });

    if (!user) throw new NotFoundException('User not found');
    
    return {
      ...user,
      permissions: user.permissions?.map((p) => p.name) || [],
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const emailExists = await this.userRepo.findOne({
        where: { email: updateProfileDto.email },
      });
      if (emailExists) throw new ConflictException('Email already in use');
    }

    Object.assign(user, updateProfileDto);
    await this.userRepo.save(user);

    return {
      message: 'Profile updated successfully',
      user: { id: user.id, name: user.name, email: user.email, phoneNumber: user.phoneNumber },
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) throw new BadRequestException('Current password is incorrect');

    user.password = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);

    return { message: 'Password changed successfully' };
  }

  async getAllUsers(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;

    const whereConditions: any[] = [];
    if (search) {
      whereConditions.push(
        { name: ILike(`%${search}%`) },
        { email: ILike(`%${search}%`) },
      );
    }

    const [users, total] = await this.userRepo.findAndCount({
      where: whereConditions.length > 0 ? whereConditions : undefined,
      select: ['id', 'name', 'email', 'phoneNumber', 'role', 'currentSubscriptionId', 'createdAt', 'updatedAt'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    // Get subscription info for each user
    const usersWithSubscription = await Promise.all(
      users.map(async (user) => {
        const subscription = await this.subscriptionRepo.findOne({
          where: { userId: user.id, status: SubscriptionStatus.ACTIVE },
          relations: ['package'],
        });
        return {
          ...user,
          subscription: subscription ? {
            id: subscription.id,
            packageName: subscription.package?.name || 'No plan',
            status: subscription.status,
          } : null,
        };
      })
    );

    return {
      users: usersWithSubscription,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'name', 'email', 'phoneNumber', 'role', 'currentSubscriptionId', 'createdAt', 'updatedAt'],
    });

    if (!user) throw new NotFoundException('User not found');

    const subscription = await this.subscriptionRepo.findOne({
      where: { userId: user.id, status: SubscriptionStatus.ACTIVE },
      relations: ['package'],
    });

    return {
      ...user,
      subscription: subscription ? {
        id: subscription.id,
        packageName: subscription.package?.name || 'No plan',
        status: subscription.status,
        messagesLimit: subscription.messagesLimit,
        messagesUsed: subscription.messagesUsed,
        messagesRemaining: subscription.messagesRemaining,
      } : null,
    };
  }

  async createUserByAdmin(createUserDto: CreateUserDto) {
    const { name, email, password, phoneNumber, role } = createUserDto;

    const exists = await this.userRepo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = this.userRepo.create({
      name,
      email,
      phoneNumber: phoneNumber || null,
      password: hashedPassword,
      role: role || Role.USER,
    });
    await this.userRepo.save(user);

    return {
      message: 'User created successfully',
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }

  async updateUserByAdmin(userId: string, updateData: { name?: string; email?: string; role?: string }) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await this.userRepo.findOne({
        where: { email: updateData.email },
      });
      if (emailExists) throw new ConflictException('Email already in use');
    }

    Object.assign(user, updateData);
    await this.userRepo.save(user);

    return {
      message: 'User updated successfully',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
