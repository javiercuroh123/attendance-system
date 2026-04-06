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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleCode } from '../common/enums/role-code.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('check')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  @ApiOperation({ summary: 'Registrar entrada o salida con QR' })
  check(
    @Body() dto: CreateAttendanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.check(dto, user);
  }

  @Get('me')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  @ApiOperation({ summary: 'Consultar historial propio de asistencia' })
  findMe(@CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findMyAttendance(user);
  }

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Consultar asistencia general con filtros' })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.attendanceService.findAll(user, query);
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  @ApiOperation({ summary: 'Obtener un registro de asistencia' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attendanceService.findOne(id, user);
  }

  @Patch(':id/manual-adjustment')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH)
  @ApiOperation({
    summary: 'Corregir una asistencia manualmente con auditoría',
  })
  manualAdjustment(
    @Param('id') id: string,
    @Body() dto: ManualAdjustmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attendanceService.manualAdjustment(id, dto, user);
  }
}
