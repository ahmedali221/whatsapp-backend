import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { dataSourceOptions } from './config/database.config';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PackagesModule } from './packages/packages.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { UserPackagesModule } from './user-packages/user-packages.module';
import { ContactsModule } from './contacts/contacts.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(dataSourceOptions),
    AuthModule,
    PackagesModule,
    WhatsappModule,
    UserPackagesModule,
    ContactsModule,
    DashboardModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}