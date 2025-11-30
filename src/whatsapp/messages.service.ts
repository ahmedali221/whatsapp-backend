import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageStatus } from './entities/message.entity';
import { Contact } from '../contacts/entities/contact.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(Contact)
    private contactRepository: Repository<Contact>,
  ) {}

  async createMessage(
    userId: string,
    recipientPhone: string,
    message: string,
    recipientName?: string,
    status: MessageStatus = MessageStatus.PENDING,
    error?: string,
  ): Promise<Message> {
    // Try to find contact by phone number
    let contact: Contact | null = null;
    try {
      contact = await this.contactRepository.findOne({
        where: { userId, phone: recipientPhone },
      });
    } catch (error) {
      // Contact not found, continue without contact
    }

    const messageEntity = this.messageRepository.create({
      userId,
      contactId: contact?.id || null,
      recipientPhone,
      recipientName: recipientName || contact?.name || null,
      message,
      status,
      error: error || null,
    });

    return await this.messageRepository.save(messageEntity);
  }

  async createBulkMessages(
    userId: string,
    messages: Array<{ phone: string; message: string; name?: string; status: MessageStatus; error?: string }>,
  ): Promise<Message[]> {
    const messageEntities: Message[] = [];

    for (const msg of messages) {
      // Try to find contact by phone number
      let contact: Contact | null = null;
      try {
        contact = await this.contactRepository.findOne({
          where: { userId, phone: msg.phone },
        });
      } catch (error) {
        // Contact not found, continue without contact
      }

      const messageEntity = this.messageRepository.create({
        userId,
        contactId: contact?.id || null,
        recipientPhone: msg.phone,
        recipientName: msg.name || contact?.name || null,
        message: msg.message,
        status: msg.status,
        error: msg.error || null,
      });

      messageEntities.push(messageEntity);
    }

    return await this.messageRepository.save(messageEntities);
  }

  async getAllMessages(userId: string, status?: MessageStatus) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const messages = await this.messageRepository.find({
      where,
      relations: ['contact'],
      order: { createdAt: 'DESC' },
    });

    return {
      total: messages.length,
      messages,
    };
  }

  async getMessageById(userId: string, id: string) {
    const message = await this.messageRepository.findOne({
      where: { id, userId },
      relations: ['contact'],
    });

    if (!message) {
      throw new Error('Message not found');
    }

    return message;
  }

  async getMessagesByContact(userId: string, contactId: string) {
    const messages = await this.messageRepository.find({
      where: { userId, contactId },
      order: { createdAt: 'DESC' },
    });

    return {
      total: messages.length,
      messages,
    };
  }

  async getMessagesStatistics(userId: string) {
    const total = await this.messageRepository.count({ where: { userId } });
    const sent = await this.messageRepository.count({ where: { userId, status: MessageStatus.SENT } });
    const failed = await this.messageRepository.count({ where: { userId, status: MessageStatus.FAILED } });
    const pending = await this.messageRepository.count({ where: { userId, status: MessageStatus.PENDING } });

    return {
      total,
      sent,
      failed,
      pending,
    };
  }

  async getGroupedMessages(userId: string) {
    // Get all messages for the user
    const messages = await this.messageRepository.find({
      where: { userId },
      relations: ['contact'],
      order: { createdAt: 'DESC' },
    });

    // Group messages by message text
    const grouped = new Map<string, {
      message: string;
      recipients: Array<{
        id: string;
        phone: string;
        name: string | null;
        status: MessageStatus;
        error: string | null;
        createdAt: Date;
      }>;
      totalCount: number;
      sentCount: number;
      failedCount: number;
      createdAt: Date;
    }>();

    for (const msg of messages) {
      const messageText = msg.message;
      
      if (!grouped.has(messageText)) {
        grouped.set(messageText, {
          message: messageText,
          recipients: [],
          totalCount: 0,
          sentCount: 0,
          failedCount: 0,
          createdAt: msg.createdAt,
        });
      }

      const group = grouped.get(messageText)!;
      group.recipients.push({
        id: msg.id,
        phone: msg.recipientPhone,
        name: msg.recipientName,
        status: msg.status,
        error: msg.error,
        createdAt: msg.createdAt,
      });
      group.totalCount++;
      if (msg.status === MessageStatus.SENT) {
        group.sentCount++;
      } else if (msg.status === MessageStatus.FAILED) {
        group.failedCount++;
      }
    }

    // Convert to array and sort by creation date (newest first)
    return Array.from(grouped.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getMessagesByMessageText(userId: string, messageText: string) {
    const messages = await this.messageRepository.find({
      where: { userId, message: messageText },
      relations: ['contact'],
      order: { createdAt: 'DESC' },
    });

    return {
      message: messageText,
      total: messages.length,
      recipients: messages.map(msg => ({
        id: msg.id,
        phone: msg.recipientPhone,
        name: msg.recipientName,
        status: msg.status,
        error: msg.error,
        createdAt: msg.createdAt,
        contact: msg.contact,
      })),
    };
  }

  // Admin methods - get all messages from all users
  async getAllMessagesAdmin(status?: MessageStatus, page: number = 1, limit: number = 10) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    const [messages, total] = await this.messageRepository.findAndCount({
      where,
      relations: ['user', 'contact'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getMessageByIdAdmin(id: string) {
    const message = await this.messageRepository.findOne({
      where: { id },
      relations: ['user', 'contact'],
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Get all messages with the same message text to show recipients
    const groupedMessages = await this.messageRepository.find({
      where: { message: message.message },
      relations: ['contact', 'user'],
      order: { createdAt: 'DESC' },
    });

    return {
      ...message,
      recipients: groupedMessages.map(msg => ({
        id: msg.id,
        phone: msg.recipientPhone,
        name: msg.recipientName,
        status: msg.status,
        error: msg.error,
        createdAt: msg.createdAt,
        contact: msg.contact,
        user: msg.user,
      })),
    };
  }

  async getMessagesStatisticsAdmin() {
    const total = await this.messageRepository.count();
    const sent = await this.messageRepository.count({ where: { status: MessageStatus.SENT } });
    const failed = await this.messageRepository.count({ where: { status: MessageStatus.FAILED } });
    const pending = await this.messageRepository.count({ where: { status: MessageStatus.PENDING } });

    return {
      total,
      sent,
      failed,
      pending,
    };
  }

  async getGroupedMessagesAdmin() {
    // Get all messages from all users
    const messages = await this.messageRepository.find({
      relations: ['user', 'contact'],
      order: { createdAt: 'DESC' },
    });

    // Group messages by message text
    const grouped = new Map<string, {
      message: string;
      recipients: Array<{
        id: string;
        phone: string;
        name: string | null;
        status: MessageStatus;
        error: string | null;
        createdAt: Date;
        userId: string;
        userName: string | null;
      }>;
      totalCount: number;
      sentCount: number;
      failedCount: number;
      createdAt: Date;
    }>();

    for (const msg of messages) {
      const messageText = msg.message;
      
      if (!grouped.has(messageText)) {
        grouped.set(messageText, {
          message: messageText,
          recipients: [],
          totalCount: 0,
          sentCount: 0,
          failedCount: 0,
          createdAt: msg.createdAt,
        });
      }

      const group = grouped.get(messageText)!;
      group.recipients.push({
        id: msg.id,
        phone: msg.recipientPhone,
        name: msg.recipientName,
        status: msg.status,
        error: msg.error,
        createdAt: msg.createdAt,
        userId: msg.userId,
        userName: msg.user?.name || null,
      });
      group.totalCount++;
      if (msg.status === MessageStatus.SENT) {
        group.sentCount++;
      } else if (msg.status === MessageStatus.FAILED) {
        group.failedCount++;
      }
    }

    // Convert to array and sort by creation date (newest first)
    return Array.from(grouped.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
}

