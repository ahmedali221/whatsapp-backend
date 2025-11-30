import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessageStatus } from './entities/message.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Role } from '../auth/entities/user.entity';
import { PermissionName } from '../auth/entities/permission.entity';

@Controller('messages')
@UseGuards(PermissionsGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  @Get()
  async getAllMessages(@Req() req: any, @Query('status') status?: MessageStatus) {
    const userId = req.user.userId;
    return this.messagesService.getAllMessages(userId, status);
  }

  @Get('statistics')
  async getStatistics(@Req() req: any) {
    const userId = req.user.userId;
    return this.messagesService.getMessagesStatistics(userId);
  }

  @Get('grouped')
  async getGroupedMessages(@Req() req: any) {
    const userId = req.user.userId;
    return this.messagesService.getGroupedMessages(userId);
  }

  @Get('by-text')
  async getMessagesByText(@Req() req: any, @Query('message') messageText: string) {
    const userId = req.user.userId;
    return this.messagesService.getMessagesByMessageText(userId, messageText);
  }

  @Get(':id')
  async getMessageById(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.userId;
    return this.messagesService.getMessageById(userId, id);
  }

  @Get('contact/:contactId')
  async getMessagesByContact(@Req() req: any, @Param('contactId') contactId: string) {
    const userId = req.user.userId;
    return this.messagesService.getMessagesByContact(userId, contactId);
  }

  // Admin endpoints - get all messages from all users
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permissions(PermissionName.VIEW_MESSAGES)
  @Get('admin/all')
  async getAllMessagesAdmin(
    @Query('status') status?: MessageStatus,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.messagesService.getAllMessagesAdmin(
      status,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permissions(PermissionName.VIEW_MESSAGES)
  @Get('admin/statistics')
  async getStatisticsAdmin() {
    return this.messagesService.getMessagesStatisticsAdmin();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permissions(PermissionName.VIEW_MESSAGES)
  @Get('admin/grouped')
  async getGroupedMessagesAdmin() {
    return this.messagesService.getGroupedMessagesAdmin();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @Permissions(PermissionName.VIEW_MESSAGES)
  @Get('admin/:id')
  async getMessageByIdAdmin(@Param('id') id: string) {
    return this.messagesService.getMessageByIdAdmin(id);
  }
}

