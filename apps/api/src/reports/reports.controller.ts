import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../common/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily')
  @ApiOperation({ summary: 'Reporte diario de asistencia' })
  daily(@Query() query: Record<string, string | undefined>) {
    return this.reportsService.daily(query);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Reporte mensual de asistencia' })
  monthly(@Query() query: Record<string, string | undefined>) {
    return this.reportsService.monthly(query);
  }

  @Get('late')
  @ApiOperation({ summary: 'Reporte de tardanzas' })
  late(@Query() query: Record<string, string | undefined>) {
    return this.reportsService.late(query);
  }

  @Get('absences')
  @ApiOperation({ summary: 'Reporte de faltas / incidencias tipo ausencia' })
  absences(@Query() query: Record<string, string | undefined>) {
    return this.reportsService.absences(query);
  }

  @Get('export')
  @ApiOperation({ summary: 'Exportar reporte a CSV base' })
  export(@Query() query: Record<string, string | undefined>) {
    return this.reportsService.export(query);
  }
}
