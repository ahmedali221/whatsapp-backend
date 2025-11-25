import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserPackagesService } from './user-packages.service';
import { SubscribePackageDto } from './dto/subscribe-package.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';

@Controller('user-packages')
export class UserPackagesController {
  constructor(private userPackagesService: UserPackagesService) {}

  /**
   * Subscribe to a package
   */
  @Post('subscribe')
  async subscribeToPackage(@Req() req: any, @Body() subscribeDto: SubscribePackageDto) {
    return this.userPackagesService.subscribeToPackage(req.user.userId, subscribeDto);
  }

  /**
   * Get current active subscription
   */
  @Get('current')
  async getCurrentSubscription(@Req() req: any) {
    return this.userPackagesService.getCurrentSubscription(req.user.userId);
  }

  /**
   * Get all user subscriptions (history)
   */
  @Get('history')
  async getUserSubscriptions(@Req() req: any) {
    return this.userPackagesService.getUserSubscriptions(req.user.userId);
  }

  /**
   * Get subscription by ID
   */
  @Get(':id')
  async getSubscriptionById(@Req() req: any, @Param('id') id: string) {
    return this.userPackagesService.getSubscriptionById(req.user.userId, id);
  }

  /**
   * Update subscription
   */
  @Patch(':id')
  async updateSubscription(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    return this.userPackagesService.updateSubscription(req.user.userId, id, updateDto);
  }

  /**
   * Cancel subscription
   */
  @Delete(':id')
  async cancelSubscription(@Req() req: any, @Param('id') id: string) {
    return this.userPackagesService.cancelSubscription(req.user.userId, id);
  }

  /**
   * Get usage statistics
   */
  @Get('statistics/usage')
  async getUsageStatistics(@Req() req: any) {
    return this.userPackagesService.getUsageStatistics(req.user.userId);
  }
}

