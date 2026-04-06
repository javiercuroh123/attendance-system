import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async create(dto: CreateScheduleDto) {
    const existing = await this.scheduleRepository.findOne({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException('Ya existe un horario con ese código');
    }

    const schedule = this.scheduleRepository.create({
      code: dto.code,
      name: dto.name,
      start_time: dto.startTime,
      end_time: dto.endTime,
      tolerance_minutes: dto.toleranceMinutes,
      work_days: dto.workDays,
      status: dto.status ?? 'ACTIVE',
    });

    return this.scheduleRepository.save(schedule);
  }

  findAll() {
    return this.scheduleRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }
    return schedule;
  }

  async update(id: string, dto: UpdateScheduleDto) {
    const schedule = await this.findOne(id);
    if (dto.code !== undefined) schedule.code = dto.code;
    if (dto.name !== undefined) schedule.name = dto.name;
    if (dto.startTime !== undefined) schedule.start_time = dto.startTime;
    if (dto.endTime !== undefined) schedule.end_time = dto.endTime;
    if (dto.toleranceMinutes !== undefined)
      schedule.tolerance_minutes = dto.toleranceMinutes;
    if (dto.workDays !== undefined) schedule.work_days = dto.workDays;
    if (dto.status !== undefined) schedule.status = dto.status;
    return this.scheduleRepository.save(schedule);
  }
}
