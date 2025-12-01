import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
} from 'typeorm';
import { User } from './user.entity';

export enum PermissionName {
  // User Management
  VIEW_USERS = 'VIEW_USERS',
  CREATE_USERS = 'CREATE_USERS',
  EDIT_USERS = 'EDIT_USERS',
  DELETE_USERS = 'DELETE_USERS',
  
  // Plan Management
  VIEW_PLANS = 'VIEW_PLANS',
  CREATE_PLANS = 'CREATE_PLANS',
  EDIT_PLANS = 'EDIT_PLANS',
  DELETE_PLANS = 'DELETE_PLANS',
  
  // Message Management
  VIEW_MESSAGES = 'VIEW_MESSAGES',
  SEND_MESSAGES = 'SEND_MESSAGES',
  DELETE_MESSAGES = 'DELETE_MESSAGES',
  
  // Dashboard
  VIEW_DASHBOARD = 'VIEW_DASHBOARD',
  
  // Permissions Management
  VIEW_PERMISSIONS = 'VIEW_PERMISSIONS',
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS',
  
  // Settings
  VIEW_SETTINGS = 'VIEW_SETTINGS',
  EDIT_SETTINGS = 'EDIT_SETTINGS',
}

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: PermissionName, unique: true })
  name: PermissionName;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'varchar', nullable: true })
  category: string; // e.g., 'Users', 'Plans', 'Messages'

  @ManyToMany(() => User, (user) => user.permissions)
  users: User[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}





