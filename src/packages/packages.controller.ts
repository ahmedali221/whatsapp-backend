import { Controller, Get, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@Controller('packages')
export class PackagesController {
  constructor(private packagesService: PackagesService) {}

  // ========== Public Endpoints ==========

  @Public()
  @Get()
  async getAllPackages() {
    return this.packagesService.getAllPackages();
  }

  @Public()
  @Get(':id')
  async getPackageById(@Param('id') id: string) {
    return this.packagesService.getPackageById(id);
  }

  // ========== Admin Only Endpoints ==========

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Post()
  async createPackage(@Body() createPackageDto: CreatePackageDto) {
    return this.packagesService.createPackage(createPackageDto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Patch(':id')
  async updatePackage(@Param('id') id: string, @Body() updatePackageDto: UpdatePackageDto) {
    return this.packagesService.updatePackage(id, updatePackageDto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Delete(':id')
  async deletePackage(@Param('id') id: string) {
    return this.packagesService.deletePackage(id);
  }

  // ========== User Subscription Endpoints ==========

  @Post('subscribe')
  async subscribe(@Req() req: any, @Body() subscribeDto: SubscribeDto) {
    return this.packagesService.subscribe(req.user.userId, subscribeDto.packageId);
  }

  @Get('my-subscription/current')
  async getCurrentSubscription(@Req() req: any) {
    return this.packagesService.getCurrentSubscription(req.user.userId);
  }

  @Get('my-subscription/history')
  async getSubscriptionHistory(@Req() req: any) {
    return this.packagesService.getSubscriptionHistory(req.user.userId);
  }
}
