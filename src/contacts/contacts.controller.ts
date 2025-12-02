import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { UploadContactsDto } from './dto/upload-contacts.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  // ========== Upload Contacts (JSON) ==========

  @Post('upload-contacts')
  async uploadContacts(
    @Req() req: any,
    @Body() uploadContactsDto: UploadContactsDto,
  ) {
    return this.contactsService.uploadContacts(req.user.userId, uploadContactsDto.contacts, uploadContactsDto.groupName);
  }

  // ========== CRUD Endpoints ==========

  @Post()
  async createContact(@Req() req: any, @Body() createContactDto: CreateContactDto) {
    return this.contactsService.createContact(req.user.userId, createContactDto);
  }

  @Get()
  async getAllContacts(@Req() req: any, @Query('groupName') groupName?: string) {
    return this.contactsService.getAllContacts(req.user.userId, groupName);
  }

  @Get('groups')
  async getGroups(@Req() req: any) {
    return this.contactsService.getGroups(req.user.userId);
  }

  @Get(':id')
  async getContactById(@Req() req: any, @Param('id') id: string) {
    return this.contactsService.getContactById(req.user.userId, id);
  }

  @Put(':id')
  async updateContact(@Req() req: any, @Param('id') id: string, @Body() updateContactDto: UpdateContactDto) {
    return this.contactsService.updateContact(req.user.userId, id, updateContactDto);
  }

  @Delete(':id')
  async deleteContact(@Req() req: any, @Param('id') id: string) {
    return this.contactsService.deleteContact(req.user.userId, id);
  }

  @Delete()
  async deleteAllContacts(@Req() req: any, @Query('groupName') groupName?: string) {
    return this.contactsService.deleteAllContacts(req.user.userId, groupName);
  }
}
