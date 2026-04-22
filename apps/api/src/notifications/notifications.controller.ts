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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RoleCode } from '../common/enums/role-code.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  @Post('internal')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Crear notificacion interna' })
  async createInternal(
    @Body() dto: CreateNotificationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    const notification = await this.notificationsService.createInternal(dto);

    await this.auditService.create({
      actorUserId: actor.userId,
      module: 'notifications',
      action: 'CREATE',
      entityName: 'notifications',
      entityId: notification.id,
      newData: {
        recipientUserId: notification.recipient_user_id,
        type: notification.type,
      },
    });

    return notification;
  }

  @Get('me')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  @ApiOperation({ summary: 'Listar notificaciones del usuario autenticado' })
  findMe(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.findForUser(user.userId, user.roles);
  }

  @Patch(':id/read')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR, RoleCode.EMPLOYEE)
  @ApiOperation({ summary: 'Marcar notificacion como leida' })
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const notification = await this.notificationsService.markAsRead(
      id,
      user.userId,
      user.roles,
    );

    await this.auditService.create({
      actorUserId: user.userId,
      module: 'notifications',
      action: 'MARK_READ',
      entityName: 'notifications',
      entityId: notification.id,
      newData: { status: notification.status },
    });

    return notification;
  }
}
