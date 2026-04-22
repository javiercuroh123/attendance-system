import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleCode } from '../common/enums/role-code.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener configuracion general del sistema' })
  get() {
    return this.settingsService.get();
  }

  @Patch()
  @Roles(RoleCode.ADMIN, RoleCode.RRHH)
  @ApiOperation({ summary: 'Actualizar configuracion general del sistema' })
  async update(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const previous = await this.settingsService.get();
    const updated = await this.settingsService.update(dto);

    await this.auditService.create({
      actorUserId: actor.userId,
      module: 'settings',
      action: 'UPDATE',
      entityName: 'system_settings',
      entityId: updated.id,
      oldData: {
        companyName: previous.company_name,
        worksiteName: previous.worksite_name,
        qrPointDescription: previous.qr_point_description,
        status: previous.status,
      },
      newData: {
        companyName: updated.company_name,
        worksiteName: updated.worksite_name,
        qrPointDescription: updated.qr_point_description,
        status: updated.status,
      },
    });

    return updated;
  }
}
