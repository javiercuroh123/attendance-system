import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { CreateQrDto } from './dto/create-qr.dto';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { QrSession } from './entities/qr.entity';

@Injectable()
export class QrService {
  constructor(
    @InjectRepository(QrSession)
    private readonly qrRepository: Repository<QrSession>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async createSession(dto: CreateQrDto, issuedBy: string) {
    const branch = await this.branchRepository.findOne({
      where: { id: dto.branchId },
    });
    if (!branch) {
      throw new NotFoundException('Sede no encontrada');
    }

    const rawToken = crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const validitySeconds = dto.validitySeconds ?? 300;
    const expiresAt = new Date(now.getTime() + validitySeconds * 1000);

    const session = this.qrRepository.create({
      branch,
      issued_by: issuedBy,
      token_hash: this.hashToken(rawToken),
      starts_at: now,
      expires_at: expiresAt,
      status: 'ACTIVE',
    });

    const created = await this.qrRepository.save(session);

    return {
      id: created.id,
      branchId: branch.id,
      startsAt: created.starts_at,
      expiresAt: created.expires_at,
      qrToken: rawToken,
      qrPayload: {
        qrToken: rawToken,
        qrSessionId: created.id,
        branchId: branch.id,
        expiresAt: created.expires_at.toISOString(),
      },
    };
  }

  async getSession(id: string) {
    const session = await this.qrRepository.findOne({
      where: { id },
      relations: ['branch'],
    });
    if (!session) {
      throw new NotFoundException('Sesión QR no encontrada');
    }
    return session;
  }

  async validate(dto: ValidateQrDto) {
    const session = await this.qrRepository.findOne({
      where: { token_hash: this.hashToken(dto.qrToken), status: 'ACTIVE' },
      relations: ['branch'],
    });

    if (!session) {
      throw new NotFoundException('QR inválido');
    }

    const now = new Date();
    if (now < session.starts_at) {
      throw new BadRequestException('El QR aún no está vigente');
    }
    if (now > session.expires_at) {
      throw new BadRequestException('El QR ha expirado');
    }

    return {
      valid: true,
      sessionId: session.id,
      branchId: session.branch.id,
      branchName: session.branch.name,
      expiresAt: session.expires_at,
      serverTime: now,
    };
  }

  async findActiveSessionByToken(qrToken: string) {
    const session = await this.qrRepository.findOne({
      where: { token_hash: this.hashToken(qrToken), status: 'ACTIVE' },
      relations: ['branch'],
    });

    if (!session) {
      throw new NotFoundException('QR inválido');
    }

    const now = new Date();
    if (now > session.expires_at) {
      throw new BadRequestException('El QR ha expirado');
    }

    return session;
  }
}
