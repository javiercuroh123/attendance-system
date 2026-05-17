import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RoleCode } from '../common/enums/role-code.enum';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    const count = await this.userRepository.count();
    if (count > 0) {
      return;
    }

    const admin = this.userRepository.create({
      email: 'admin@consultora.com',
      password_hash: await bcrypt.hash('12345678', 10),
      status: 'ACTIVE',
      role: RoleCode.ADMIN,
    });

    await this.userRepository.save(admin);
  }

  async findByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    return this.userRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = :email', { email: normalizedEmail })
      .getOne();
  }

  async findOneOrFail(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async findAll() {
    const users = await this.userRepository.find({ order: { created_at: 'DESC' } });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      status: user.status,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      role: user.role,
    }));
  }

  async create(dto: CreateUserDto) {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const user = this.userRepository.create({
      email: normalizedEmail,
      password_hash: await bcrypt.hash(dto.password, 10),
      status: dto.status ?? 'ACTIVE',
      role: dto.role ?? RoleCode.EMPLOYEE,
    });

    const created = await this.userRepository.save(user);
    return this.findOneOrFail(created.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOneOrFail(id);

    if (dto.email && dto.email !== user.email) {
      const normalizedEmail = dto.email.trim().toLowerCase();
      const existing = await this.findByEmail(normalizedEmail);
      if (existing && existing.id !== id) {
        throw new ConflictException('El correo ya está registrado');
      }
      user.email = normalizedEmail;
    }

    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.status) {
      user.status = dto.status;
    }

    if (dto.role !== undefined) user.role = dto.role;

    await this.userRepository.save(user);
    return this.findOneOrFail(id);
  }

  async updateStatus(id: string, dto: UpdateUserStatusDto) {
    const user = await this.findOneOrFail(id);
    user.status = dto.status;
    await this.userRepository.save(user);
    return this.findOneOrFail(id);
  }

  async updateLastLoginAndRefreshToken(userId: string, refreshToken: string) {
    const user = await this.findOneOrFail(userId);
    user.last_login_at = new Date();
    user.refresh_token_hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.save(user);
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const user = await this.findOneOrFail(userId);
    user.refresh_token_hash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.save(user);
  }

  async clearRefreshToken(userId: string) {
    const user = await this.findOneOrFail(userId);
    user.refresh_token_hash = null;
    await this.userRepository.save(user);
  }
}
