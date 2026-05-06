import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../common/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleCode.ADMIN, RoleCode.RRHH)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Listar auditoría' })
  findAll(@Query('limit') limitRaw?: string, @Query('module') module?: string) {
    const parsedLimit = limitRaw ? Number(limitRaw) : undefined;
    const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
    return this.auditService.findAll({
      limit,
      module,
    });
  }

  @Get(':entity/:id')
  @ApiOperation({ summary: 'Listar auditoría por entidad' })
  findByEntity(@Param('entity') entity: string, @Param('id') id: string) {
    return this.auditService.findByEntity(entity, id);
  }
}
