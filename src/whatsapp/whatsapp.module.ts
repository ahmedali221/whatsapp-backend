import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './whatsapp.controller';
import { MessagesController } from './messages.controller';
import { WhatsappService } from './whatsapp.service';
import { MessagesService } from './messages.service';
import { WhatsappConnection } from './entities/whatsapp-connection.entity';
import { Message } from './entities/message.entity';
import { User } from '../auth/entities/user.entity';
import { Subscription } from '../packages/entities/subscription.entity';
import { Contact } from '../contacts/entities/contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WhatsappConnection, Message, User, Subscription, Contact])],
  controllers: [WhatsappController, MessagesController],
  providers: [WhatsappService, MessagesService],
  exports: [WhatsappService, MessagesService],
})
export class WhatsappModule {}


