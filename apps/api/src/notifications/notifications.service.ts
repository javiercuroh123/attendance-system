import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { RoleCode } from '../common/enums/role-code.enum';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async createInternal(dto: CreateNotificationDto) {
    const notification = this.notificationRepository.create({
      recipient_user_id: dto.recipientUserId ?? null,
      title: dto.title,
      message: dto.message,
      type: dto.type ?? 'INTERNAL',
      status: 'UNREAD',
    });

    return this.notificationRepository.save(notification);
  }

  async findForUser(userId: string, roles: string[]) {
    const hasGlobalRead =
      roles.includes(RoleCode.ADMIN) || roles.includes(RoleCode.RRHH);

    if (hasGlobalRead) {
      return this.notificationRepository.find({
        order: { created_at: 'DESC' },
        take: 100,
      });
    }

    return this.notificationRepository.find({
      where: [{ recipient_user_id: userId }, { recipient_user_id: IsNull() }],
      order: { created_at: 'DESC' },
      take: 100,
    });
  }

  async markAsRead(id: string, userId: string, roles: string[]) {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notificacion no encontrada');
    }

    const isOwner =
      !notification.recipient_user_id || notification.recipient_user_id === userId;
    const hasGlobalUpdate =
      roles.includes(RoleCode.ADMIN) || roles.includes(RoleCode.RRHH);

    if (!isOwner && !hasGlobalUpdate) {
      throw new NotFoundException('Notificacion no disponible para este usuario');
    }

    notification.status = 'READ';
    notification.read_at = new Date();

    return this.notificationRepository.save(notification);
  }
}
