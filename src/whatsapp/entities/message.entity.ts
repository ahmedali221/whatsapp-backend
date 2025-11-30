import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Contact } from '../../contacts/entities/contact.entity';

export enum MessageStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'contact_id', type: 'uuid', nullable: true })
  contactId: string | null;

  @ManyToOne(() => Contact, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contact_id' })
  contact: Contact | null;

  @Column({ type: 'varchar' })
  recipientPhone: string;

  @Column({ type: 'varchar', nullable: true })
  recipientName: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.PENDING })
  status: MessageStatus;

  @Column({ nullable: true, type: 'text' })
  error: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

