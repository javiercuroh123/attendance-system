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
import { Role } from '../roles-permissions/entities/roles-permission.entity';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    const count = await this.userRepository.count();
    if (count > 0) {
      return;
    }

    const adminRole = await this.roleRepository.findOne({
      where: { code: RoleCode.ADMIN },
    });
    if (!adminRole) {
      return;
    }

    const admin = this.userRepository.create({
      email: 'admin@consultora.com',
      password_hash: await bcrypt.hash('12345678', 10),
      status: 'ACTIVE',
      roles: [adminRole],
    });

    await this.userRepository.save(admin);
  }

  async findByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
  }

  async findOneOrFail(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async findAll() {
    const users = await this.userRepository.find({
      relations: ['roles'],
      order: { created_at: 'DESC' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      status: user.status,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      roles: user.roles.map((role) => role.code),
    }));
  }

  async create(dto: CreateUserDto) {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const roles = dto.roleCodes?.length
      ? await this.roleRepository.find({
          where: dto.roleCodes.map((code) => ({ code })),
        })
      : await this.roleRepository.find({ where: { code: RoleCode.EMPLOYEE } });

    const user = this.userRepository.create({
      email: dto.email,
      password_hash: await bcrypt.hash(dto.password, 10),
      status: dto.status ?? 'ACTIVE',
      roles,
    });

    const created = await this.userRepository.save(user);
    return this.findOneOrFail(created.id);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOneOrFail(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('El correo ya está registrado');
      }
      user.email = dto.email;
    }

    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.status) {
      user.status = dto.status;
    }

    if (dto.roleCodes?.length) {
      user.roles = await this.roleRepository.find({
        where: dto.roleCodes.map((code) => ({ code })),
      });
    }

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
