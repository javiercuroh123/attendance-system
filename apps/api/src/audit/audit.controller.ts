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
  findAll(@Query('limit') limit?: number) {
    return this.auditService.findAll(limit);
  }

  @Get(':entity/:id')
  @ApiOperation({ summary: 'Listar auditoría por entidad' })
  findByEntity(@Param('entity') entity: string, @Param('id') id: string) {
    return this.auditService.findByEntity(entity, id);
  }
}
