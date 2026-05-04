import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAuditDto } from './dto/create-audit.dto';
import { AuditLog } from './entities/audit.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
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

  findAll(limit = 100) {
    return this.auditRepository.find({
      order: { created_at: 'DESC' },
      take: Math.min(limit, 500),
    });
  }

  findByEntity(entity: string, entityId: string) {
    return this.auditRepository.find({
      where: { entity_name: entity, entity_id: entityId },
      order: { created_at: 'DESC' },
    });
  }
}
