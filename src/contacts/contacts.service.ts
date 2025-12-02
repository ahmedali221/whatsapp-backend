import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
  ) {}

  // ========== Upload Contacts (JSON) ==========

  async uploadContacts(userId: string, contactsData: Array<{ name: string; phone: string; email?: string }>, groupName?: string) {
    if (!contactsData || !Array.isArray(contactsData) || contactsData.length === 0) {
      throw new BadRequestException('No contacts provided');
    }

    try {
      // معالجة البيانات وحفظها
      const contacts: Contact[] = [];
      const errors: string[] = [];
      const duplicates: string[] = [];
      let skipped: number = 0;

      for (let i = 0; i < contactsData.length; i++) {
        const contactData = contactsData[i];
        
        // استخراج البيانات
        const name = contactData.name?.trim() || `Contact ${i + 1}`;
        const phone = this.normalizePhone(contactData.phone);
        const email = contactData.email?.trim() || undefined;

        // التحقق من صحة رقم الهاتف
        if (!phone || phone.length < 10) {
          errors.push(`Row ${i + 1}: Invalid phone number`);
          continue;
        }

        // التحقق من التكرار في نفس الـ user
        const existingContact = await this.contactRepo.findOne({
          where: { userId, phone },
        });

        if (existingContact) {
          duplicates.push(`${name} (${phone})`);
          skipped++;
          continue;
        }

        // إنشاء الـ Contact
        const contact = this.contactRepo.create({
          userId,
          name,
          phone,
          email,
          groupName: groupName || 'Imported from Excel',
        });

        contacts.push(contact);
      }

      // حفظ الـ Contacts
      if (contacts.length > 0) {
        await this.contactRepo.save(contacts);
      }

      return {
        message: 'Contacts uploaded successfully',
        statistics: {
          totalRows: contactsData.length,
          imported: contacts.length,
          duplicates: duplicates.length,
          skipped: skipped,
          errors: errors.length,
        },
        duplicatesList: duplicates.length > 0 ? duplicates : undefined,
        errorsList: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to process contacts: ${error.message}`);
    }
  }

  // ========== CRUD Operations ==========

  async createContact(userId: string, createContactDto: CreateContactDto) {
    const { name, phone, email, groupName } = createContactDto;

    const existing = await this.contactRepo.findOne({
      where: { userId, phone },
    });

    if (existing) {
      throw new BadRequestException('Contact with this phone number already exists');
    }

    const contact = this.contactRepo.create({
      userId,
      name,
      phone: this.normalizePhone(phone),
      email,
      groupName,
    });

    await this.contactRepo.save(contact);

    return {
      message: 'Contact created successfully',
      contact,
    };
  }

  async getAllContacts(userId: string, groupName?: string) {
    const where: any = { userId };
    if (groupName) {
      where.groupName = groupName;
    }

    const contacts = await this.contactRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    return {
      total: contacts.length,
      contacts,
    };
  }

  async getContactById(userId: string, id: string) {
    const contact = await this.contactRepo.findOne({
      where: { id, userId },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async updateContact(userId: string, id: string, updateData: { name?: string; phone?: string; email?: string; groupName?: string }) {
    const contact = await this.getContactById(userId, id);

    // If phone is being updated, check for duplicates
    if (updateData.phone && updateData.phone !== contact.phone) {
      const normalizedPhone = this.normalizePhone(updateData.phone);
      const existing = await this.contactRepo.findOne({
        where: { userId, phone: normalizedPhone },
      });

      if (existing && existing.id !== id) {
        throw new BadRequestException('Contact with this phone number already exists');
      }
      updateData.phone = normalizedPhone;
    }

    // Update contact fields
    if (updateData.name !== undefined) contact.name = updateData.name;
    if (updateData.phone !== undefined) contact.phone = updateData.phone;
    if (updateData.email !== undefined) contact.email = updateData.email;
    if (updateData.groupName !== undefined) contact.groupName = updateData.groupName;

    await this.contactRepo.save(contact);

    return {
      message: 'Contact updated successfully',
      contact,
    };
  }

  async deleteContact(userId: string, id: string) {
    const contact = await this.getContactById(userId, id);
    await this.contactRepo.remove(contact);

    return { message: 'Contact deleted successfully' };
  }

  async deleteAllContacts(userId: string, groupName?: string) {
    const where: any = { userId };
    if (groupName) {
      where.groupName = groupName;
    }

    const result = await this.contactRepo.delete(where);

    return {
      message: 'Contacts deleted successfully',
      deletedCount: result.affected || 0,
    };
  }

  async getGroups(userId: string) {
    const contacts = await this.contactRepo
      .createQueryBuilder('contact')
      .select('contact.groupName', 'groupName')
      .addSelect('COUNT(*)', 'count')
      .where('contact.userId = :userId', { userId })
      .andWhere('contact.groupName IS NOT NULL')
      .groupBy('contact.groupName')
      .getRawMany();

    return {
      total: contacts.length,
      groups: contacts.map(g => ({
        name: g.groupName,
        count: parseInt(g.count),
      })),
    };
  }

  async getContactsCount(userId: string) {
    return this.contactRepo.count({ where: { userId } });
  }

  // ========== Helper Methods ==========

  private normalizePhone(phone: string): string {
    if (!phone) return '';
    
    // إزالة كل الرموز غير الأرقام والـ +
    let normalized = phone.toString().replace(/[^\d+]/g, '');
    
    // إضافة + في البداية لو مش موجود
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }
}
