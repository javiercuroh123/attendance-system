import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import { CreateAuditDto } from './dto/create-audit.dto';
import { AuditLog } from './entities/audit.entity';
import { User } from '../users/entities/user.entity';

interface AuditListParams {
  limit?: number;
  module?: string;
}

export interface AuditActorView {
  id: string;
  email: string;
  role: string;
  status: string;
}

export interface AuditLogView {
  id: string;
  actor_user_id: string;
  actor_user: AuditActorView | null;
  module: string;
  action: string;
  entity_name: string;
  entity_id: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  status: string;
  ip_address?: string | null;
  device_info?: Record<string, unknown> | null;
  created_at: Date;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateAuditDto) {
    const entry = this.auditRepository.create({
      actor_user: { id: dto.actorUserId } as User,
      module: dto.module,
      action: dto.action,
      entity_name: dto.entityName,
      entity_id: dto.entityId,
      old_data: dto.oldData ?? null,
      new_data: dto.newData ?? null,
      status: dto.status ?? 'SUCCESS',
    });

    return this.auditRepository.save(entry);
  }

  async findAll(params: AuditListParams = {}): Promise<AuditLogView[]> {
    const normalizedModule = params.module?.trim();
    const where: FindOptionsWhere<AuditLog> | undefined = normalizedModule
      ? { module: normalizedModule }
      : undefined;

    const rows = await this.auditRepository.find({
      order: { created_at: 'DESC' },
      where,
      take: this.normalizeLimit(params.limit),
    });

    return this.mapWithActors(rows);
  }

  async findByEntity(entity: string, entityId: string): Promise<AuditLogView[]> {
    const rows = await this.auditRepository.find({
      where: { entity_name: entity, entity_id: entityId },
      order: { created_at: 'DESC' },
    });

    return this.mapWithActors(rows);
  }

  private normalizeLimit(limit?: number): number {
    if (!Number.isFinite(limit)) return 100;
    return Math.min(Math.max(Number(limit), 1), 500);
  }

  private async mapWithActors(rows: AuditLog[]): Promise<AuditLogView[]> {
    const actorIds = Array.from(
      new Set(rows.map((row) => row.actor_user_id).filter((id) => Boolean(id))),
    );

    const actors = actorIds.length
      ? await this.userRepository.find({
          where: { id: In(actorIds) },
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
        })
      : [];

    const actorById = new Map(actors.map((actor) => [actor.id, actor]));

    return rows.map((row) => {
      const actor = actorById.get(row.actor_user_id);

      return {
        id: row.id,
        actor_user_id: row.actor_user_id,
        actor_user: actor
          ? {
              id: actor.id,
              email: actor.email,
              role: actor.role,
              status: actor.status,
            }
          : null,
        module: row.module,
        action: row.action,
        entity_name: row.entity_name,
        entity_id: row.entity_id,
        old_data: row.old_data ?? null,
        new_data: row.new_data ?? null,
        status: row.status,
        ip_address: row.ip_address ?? null,
        device_info: row.device_info ?? null,
        created_at: row.created_at,
      };
    });
  }
}
