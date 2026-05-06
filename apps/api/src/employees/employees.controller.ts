import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly auditService: AuditService,
  ) {}

  @Post()
  @Roles(RoleCode.ADMIN, RoleCode.RRHH)
  @ApiOperation({ summary: 'Crear empleado' })
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const employee = await this.employeesService.create(dto);
    await this.auditService.create({
      actorUserId: actor.userId,
      module: 'employees',
      action: 'CREATE',
      entityName: 'employees',
      entityId: employee.id,
      newData: { code: employee.code, dni: employee.dni },
    });
    return employee;
  }

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Listar empleados' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findAll(user);
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener empleado por id' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.findOne(id, user);
  }

  @Get(':id/attendance')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  @ApiOperation({ summary: 'Obtener historial de asistencia de un empleado' })
  findAttendance(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.employeesService.findAttendanceByEmployeeId(id, user, query);
  }

  @Patch(':id')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH)
  @ApiOperation({ summary: 'Actualizar empleado' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const previous = await this.employeesService.findOne(id);
    const employee = await this.employeesService.update(id, dto);
    await this.auditService.create({
      actorUserId: actor.userId,
      module: 'employees',
      action: 'UPDATE',
      entityName: 'employees',
      entityId: id,
      oldData: {
        code: previous.code,
        dni: previous.dni,
        status: previous.status,
      },
      newData: {
        code: employee.code,
        dni: employee.dni,
        status: employee.status,
      },
    });
    return employee;
  }
}
