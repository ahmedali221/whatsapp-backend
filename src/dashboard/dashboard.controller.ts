import { Controller, Get, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/entities/user.entity';

@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get()
  async getUserDashboard(@Req() req: any) {
    return this.dashboardService.getUserDashboard(req.user.userId);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Get('admin')
  async getAdminDashboard() {
    return this.dashboardService.getAdminDashboard();
  }
}
