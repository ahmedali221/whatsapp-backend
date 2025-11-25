import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import { Contact } from './entities/contact.entity';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private contactRepo: Repository<Contact>,
  ) {}

  // ========== Excel Upload ==========

  async uploadExcel(userId: string, file: Express.Multer.File, groupName?: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // التحقق من نوع الملف
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
    }

    try {
      // قراءة الملف
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // تحويل الـ Excel لـ JSON
      const data: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (data.length === 0) {
        throw new BadRequestException('Excel file is empty');
      }

      // معالجة البيانات وحفظها
      const contacts: Contact[] = [];
      const errors: string[] = [];
      const duplicates: string[] = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // استخراج البيانات (دعم أسماء أعمدة مختلفة)
        const name = row.name || row.Name || row.NAME || row['الاسم'] || `Contact ${i + 1}`;
        const phone = this.normalizePhone(
          row.phone || row.Phone || row.PHONE || row['رقم الهاتف'] || row['الرقم']
        );
        const email = row.email || row.Email || row.EMAIL || row['البريد'] || null;

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
        message: 'Excel file processed successfully',
        statistics: {
          totalRows: data.length,
          imported: contacts.length,
          duplicates: duplicates.length,
          errors: errors.length,
        },
        duplicatesList: duplicates.length > 0 ? duplicates : undefined,
        errorsList: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to process Excel file: ${error.message}`);
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
