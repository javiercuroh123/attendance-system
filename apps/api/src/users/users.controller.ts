import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleCode } from '../common/enums/role-code.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const created = await this.usersService.create(dto);
    await this.auditService.create({
      actorUserId: actor.userId,
      module: 'users',
      action: 'CREATE',
      entityName: 'users',
      entityId: created.id,
      newData: { email: created.email, status: created.status },
    });
    return created;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por id' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOneOrFail(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const previous = await this.usersService.findOneOrFail(id);
    const updated = await this.usersService.update(id, dto);
    await this.auditService.create({
      actorUserId: actor.userId,
      module: 'users',
      action: 'UPDATE',
      entityName: 'users',
      entityId: id,
      oldData: { email: previous.email, status: previous.status },
      newData: { email: updated.email, status: updated.status },
    });
    return updated;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activar o inactivar usuario' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const previous = await this.usersService.findOneOrFail(id);
    const updated = await this.usersService.updateStatus(id, dto);
    await this.auditService.create({
      actorUserId: actor.userId,
      module: 'users',
      action: 'STATUS_CHANGE',
      entityName: 'users',
      entityId: id,
      oldData: { status: previous.status },
      newData: { status: updated.status },
    });
    return updated;
  }
}
