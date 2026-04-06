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
import { AssignScheduleDto } from './dto/assign-schedule.dto';
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
  findAll() {
    return this.employeesService.findAll();
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener empleado por id' })
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
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

  @Get(':id/schedule')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Listar horarios asignados a un empleado' })
  getSchedules(@Param('id') id: string) {
    return this.employeesService.getSchedules(id);
  }

  @Post(':id/schedule')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH)
  @ApiOperation({ summary: 'Asignar horario a un empleado' })
  async assignSchedule(
    @Param('id') id: string,
    @Body() dto: AssignScheduleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const assignment = await this.employeesService.assignSchedule(id, dto);
    await this.auditService.create({
      actorUserId: actor.userId,
      module: 'employees',
      action: 'ASSIGN_SCHEDULE',
      entityName: 'employee_schedule_assignments',
      entityId: assignment.id,
      newData: {
        employeeId: id,
        scheduleId: dto.scheduleId,
        validFrom: dto.validFrom,
        validTo: dto.validTo ?? null,
      },
    });
    return assignment;
  }
}
