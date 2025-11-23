import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Admin } from './entities/admin.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepo: Repository<Admin>,
    private jwtService: JwtService,
  ) {}

  async register(name: string, email: string, password: string) {
    const exists = await this.adminRepo.findOne({ where: { email } });
    if (exists) throw new ConflictException('Email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = this.adminRepo.create({ name, email, password: hashedPassword });
    await this.adminRepo.save(admin);

    return { id: admin.id, name: admin.name, email: admin.email };
  }

  async login(email: string, password: string) {
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: admin.id, email: admin.email, role: admin.role };
    return {
      access_token: this.jwtService.sign(payload),
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    };
  }
}
