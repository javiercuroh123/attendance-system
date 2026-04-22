import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';
import { Area } from './entities/area.entity';

@Injectable()
export class AreasService {
  constructor(
    @InjectRepository(Area)
    private readonly areaRepository: Repository<Area>,
  ) {}

  async create(dto: CreateAreaDto) {
    const normalizedCode = dto.code.trim().toUpperCase();
    const exists = await this.areaRepository.findOne({
      where: { code: normalizedCode },
    });

    if (exists) {
      throw new ConflictException('El codigo de area ya existe');
    }

    const area = this.areaRepository.create({
      code: normalizedCode,
      name: dto.name.trim(),
      status: dto.status ?? 'ACTIVE',
    });

    return this.areaRepository.save(area);
  }

  findAll() {
    return this.areaRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const area = await this.areaRepository.findOne({ where: { id } });
    if (!area) {
      throw new NotFoundException('Area no encontrada');
    }
    return area;
  }

  async update(id: string, dto: UpdateAreaDto) {
    const area = await this.findOne(id);

    if (dto.code !== undefined) {
      const normalizedCode = dto.code.trim().toUpperCase();
      const existing = await this.areaRepository.findOne({
        where: { code: normalizedCode },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('El codigo de area ya existe');
      }
      area.code = normalizedCode;
    }

    if (dto.name !== undefined) {
      area.name = dto.name.trim();
    }

    if (dto.status !== undefined) {
      area.status = dto.status;
    }

    return this.areaRepository.save(area);
  }
}
