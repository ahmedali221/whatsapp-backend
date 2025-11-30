import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { WhatsappConnection } from '../../whatsapp/entities/whatsapp-connection.entity';
import { Permission } from './permission.entity';

export enum Role {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  USER = 'USER',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'phone_number', type: 'varchar', nullable: true })
  phoneNumber: string | null;

  @Column()
  password: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @Column({ name: 'current_subscription_id', type: 'uuid', nullable: true }) 
  currentSubscriptionId: string | null;

  // Relations
  // @ManyToOne(() => Subscription)
  // @JoinColumn({ name: 'current_subscription_id' })
  // currentSubscription: Subscription;

  @OneToMany(() => WhatsappConnection, (conn) => conn.user)
  whatsappConnections: WhatsappConnection[];

  @ManyToMany(() => Permission, (permission) => permission.users)
  @JoinTable({
    name: 'user_permissions',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions: Permission[];

  // @OneToMany(() => Contact, (contact) => contact.user)
  // contacts: Contact[];

  // @OneToMany(() => Message, (message) => message.user)
  // messages: Message[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
