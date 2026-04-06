import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from '../audit/audit.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleCode } from '../common/enums/role-code.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateQrDto } from './dto/create-qr.dto';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { QrService } from './qr.service';

@ApiTags('QR')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('qr')
export class QrController {
  constructor(
    private readonly qrService: QrService,
    private readonly auditService: AuditService,
  ) {}

  @Post('sessions')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Generar sesión de QR temporal' })
  async createSession(
    @Body() dto: CreateQrDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const session = await this.qrService.createSession(dto, user.userId);
    await this.auditService.create({
      actorUserId: user.userId,
      module: 'qr',
      action: 'CREATE_SESSION',
      entityName: 'qr_sessions',
      entityId: session.id,
      newData: { branchId: dto.branchId, expiresAt: session.expiresAt },
    });
    return session;
  }

  @Get('sessions/:id')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener sesión QR por id' })
  getSession(@Param('id') id: string) {
    return this.qrService.getSession(id);
  }

  @Post('validate')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  @ApiOperation({ summary: 'Validar QR antes de marcar asistencia' })
  validate(@Body() dto: ValidateQrDto) {
    return this.qrService.validate(dto);
  }
}
