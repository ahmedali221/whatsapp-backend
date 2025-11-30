import { Controller, Post, Get, Patch, Body, Req, Query, Param, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { Roles } from './decorators/roles.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { PermissionsGuard } from './guards/permissions.guard';
import { Role } from './entities/user.entity';
import { PermissionName } from './entities/permission.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  async getProfile(@Req() req: any) {
    return this.authService.getProfile(req.user.userId);
  }

  @Patch('profile')
  async updateProfile(@Req() req: any, @Body() updateProfileDto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.userId, updateProfileDto);
  }

  @Patch('change-password')
  async changePassword(@Req() req: any, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, changePasswordDto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(PermissionsGuard)
  @Permissions(PermissionName.VIEW_USERS)
  @Get('users')
  async getAllUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    return this.authService.getAllUsers(
      parseInt(page, 10),
      parseInt(limit, 10),
      search,
    );
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(PermissionsGuard)
  @Permissions(PermissionName.VIEW_USERS)
  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.authService.getUserById(id);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @UseGuards(PermissionsGuard)
  @Permissions(PermissionName.EDIT_USERS)
  @Patch('users/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: { name?: string; email?: string; role?: string },
  ) {
    return this.authService.updateUserByAdmin(id, updateData);
  }
}
