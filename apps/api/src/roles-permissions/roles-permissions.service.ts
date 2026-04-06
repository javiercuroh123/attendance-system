import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleCode } from '../common/enums/role-code.enum';
import { Role } from './entities/roles-permission.entity';
import { CreateRolesPermissionDto } from './dto/create-roles-permission.dto';
import { UpdateRolesPermissionDto } from './dto/update-roles-permission.dto';

@Injectable()
export class RolesPermissionsService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    const defaults: Array<Pick<Role, 'code' | 'name' | 'description'>> = [
      {
        code: RoleCode.ADMIN,
        name: 'Administrador',
        description: 'Acceso total al sistema',
      },
      {
        code: RoleCode.RRHH,
        name: 'Recursos Humanos',
        description: 'Control formal de asistencia e incidencias',
      },
      {
        code: RoleCode.SUPERVISOR,
        name: 'Supervisor',
        description: 'Seguimiento del personal a cargo',
      },
      {
        code: RoleCode.EMPLOYEE,
        name: 'Empleado',
        description: 'Marcación y consulta de su propia asistencia',
      },
    ];

    for (const roleData of defaults) {
      const existing = await this.roleRepository.findOne({
        where: { code: roleData.code },
      });
      if (!existing) {
        await this.roleRepository.save(this.roleRepository.create(roleData));
      }
    }
  }

  async create(dto: CreateRolesPermissionDto) {
    const existing = await this.roleRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`El rol ${dto.code} ya existe`);
    }

    const role = this.roleRepository.create(dto);
    return this.roleRepository.save(role);
  }

  findAll() {
    return this.roleRepository.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Rol no encontrado');
    }
    return role;
  }

  async findByCodes(codes: RoleCode[]) {
    if (!codes.length) {
      return [];
    }
    return this.roleRepository.find({ where: codes.map((code) => ({ code })) });
  }

  async update(id: string, dto: UpdateRolesPermissionDto) {
    const role = await this.findOne(id);
    Object.assign(role, dto);
    return this.roleRepository.save(role);
  }
}
