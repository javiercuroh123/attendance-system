import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SystemSetting } from './entities/system-setting.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
  ) {}

  private async ensureRecord() {
    let settings = await this.settingsRepository.findOne({
      order: { created_at: 'DESC' },
    });

    if (!settings) {
      settings = this.settingsRepository.create({
        company_name: 'Attendance System SAC',
        worksite_name: 'Centro Principal',
        worksite_address: null,
        worksite_latitude: null,
        worksite_longitude: null,
        qr_point_description: 'Punto principal de marcacion',
        default_timezone: 'America/Lima',
        status: 'ACTIVE',
      });
      settings = await this.settingsRepository.save(settings);
    }

    return settings;
  }

  get() {
    return this.ensureRecord();
  }

  async getActive() {
    const active = await this.settingsRepository.findOne({
      where: { status: 'ACTIVE' },
      order: { updated_at: 'DESC' },
    });

    if (active) {
      return active;
    }

    return this.ensureRecord();
  }

  async update(dto: UpdateSettingsDto) {
    const settings = await this.ensureRecord();

    if (dto.companyName !== undefined) settings.company_name = dto.companyName;
    if (dto.worksiteName !== undefined) settings.worksite_name = dto.worksiteName;
    if (dto.worksiteAddress !== undefined)
      settings.worksite_address = dto.worksiteAddress;
    if (dto.worksiteLatitude !== undefined)
      settings.worksite_latitude = dto.worksiteLatitude;
    if (dto.worksiteLongitude !== undefined)
      settings.worksite_longitude = dto.worksiteLongitude;
    if (dto.qrPointDescription !== undefined)
      settings.qr_point_description = dto.qrPointDescription;
    if (dto.defaultTimezone !== undefined)
      settings.default_timezone = dto.defaultTimezone;
    if (dto.status !== undefined) settings.status = dto.status;

    return this.settingsRepository.save(settings);
  }
}
