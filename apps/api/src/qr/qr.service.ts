import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { SystemSetting } from '../settings/entities/system-setting.entity';
import { User } from '../users/entities/user.entity';
import { CreateQrDto } from './dto/create-qr.dto';
import { ValidateQrDto } from './dto/validate-qr.dto';
import { QrSession } from './entities/qr.entity';

@Injectable()
export class QrService {
  constructor(
    @InjectRepository(QrSession)
    private readonly qrRepository: Repository<QrSession>,
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
  ) {}

  private hashToken(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async getActiveSettings() {
    const settings = await this.settingsRepository.findOne({
      where: { status: 'ACTIVE' },
      order: { updated_at: 'DESC' },
    });

    if (!settings) {
      throw new BadRequestException(
        'No existe configuracion general activa para emitir QR',
      );
    }

    return settings;
  }

  async createSession(dto: CreateQrDto, issuedBy: string) {
    const settings = await this.getActiveSettings();

    const rawToken = crypto.randomBytes(24).toString('hex');
    const now = new Date();
    const validitySeconds = dto.validitySeconds ?? 300;
    const expiresAt = new Date(now.getTime() + validitySeconds * 1000);

    const session = this.qrRepository.create({
      issued_by_user: { id: issuedBy } as User,
      token_hash: this.hashToken(rawToken),
      starts_at: now,
      expires_at: expiresAt,
      point_description:
        dto.qrPointDescription ?? settings.qr_point_description ?? null,
      status: 'ACTIVE',
    });

    const created = await this.qrRepository.save(session);

    return {
      id: created.id,
      startsAt: created.starts_at,
      expiresAt: created.expires_at,
      qrToken: rawToken,
      qrPayload: {
        qrToken: rawToken,
        qrSessionId: created.id,
        pointDescription: created.point_description,
        worksiteName: settings.worksite_name,
        expiresAt: created.expires_at.toISOString(),
      },
    };
  }

  async getSession(id: string) {
    const session = await this.qrRepository.findOne({
      where: { id },
    });

    if (!session) {
      throw new NotFoundException('Sesion QR no encontrada');
    }

    return session;
  }

  async validate(dto: ValidateQrDto) {
    const session = await this.qrRepository.findOne({
      where: { token_hash: this.hashToken(dto.qrToken), status: 'ACTIVE' },
    });

    if (!session) {
      throw new NotFoundException('QR invalido');
    }

    const now = new Date();
    if (now < session.starts_at) {
      throw new BadRequestException('El QR aun no esta vigente');
    }

    if (now > session.expires_at) {
      throw new BadRequestException('El QR ha expirado');
    }

    const settings = await this.getActiveSettings();

    return {
      valid: true,
      sessionId: session.id,
      pointDescription: session.point_description,
      worksiteName: settings.worksite_name,
      expiresAt: session.expires_at,
      serverTime: now,
    };
  }

  async findActiveSessionByToken(qrToken: string) {
    const session = await this.qrRepository.findOne({
      where: { token_hash: this.hashToken(qrToken), status: 'ACTIVE' },
    });

    if (!session) {
      throw new NotFoundException('QR invalido');
    }

    const now = new Date();
    if (now > session.expires_at) {
      throw new BadRequestException('El QR ha expirado');
    }

    return session;
  }
}
