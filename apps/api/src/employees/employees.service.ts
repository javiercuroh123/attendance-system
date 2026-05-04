import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../schedules/entities/schedule.entity';
import { User } from '../users/entities/user.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  private async findScheduleOrFail(scheduleId: string) {
    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }
    return schedule;
  }

  async create(dto: CreateEmployeeDto) {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const sameCode = await this.employeeRepository.findOne({
      where: { code: dto.code },
    });
    if (sameCode)
      throw new ConflictException('El codigo de empleado ya existe');

    const sameDni = await this.employeeRepository.findOne({
      where: { dni: dto.dni },
    });
    if (sameDni) throw new ConflictException('El DNI ya existe');

    const employee = this.employeeRepository.create({
      user,
      code: dto.code,
      dni: dto.dni,
      first_name: dto.firstName,
      last_name: dto.lastName,
      phone: dto.phone,
      area_name: dto.areaName ?? null,
      position: dto.position,
      hire_date: dto.hireDate,
      status: dto.status ?? 'ACTIVE',
    });

    if (dto.supervisorId) {
      employee.supervisor = await this.findOne(dto.supervisorId);
    }
    if (dto.scheduleId) {
      employee.schedule = await this.findScheduleOrFail(dto.scheduleId);
    }

    return this.employeeRepository.save(employee);
  }

  findAll() {
    return this.employeeRepository.find({
      relations: ['user', 'supervisor', 'schedule'],
      order: { first_name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['user', 'supervisor', 'schedule'],
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return employee;
  }

  async findByUserId(userId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'supervisor', 'schedule'],
    });
    if (!employee) {
      throw new NotFoundException(
        'No existe empleado vinculado al usuario autenticado',
      );
    }
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.findOne(id);

    if (dto.userId) {
      const user = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      employee.user = user;
    }

    if (dto.areaName !== undefined) employee.area_name = dto.areaName;

    if (dto.code !== undefined) employee.code = dto.code;
    if (dto.dni !== undefined) employee.dni = dto.dni;
    if (dto.firstName !== undefined) employee.first_name = dto.firstName;
    if (dto.lastName !== undefined) employee.last_name = dto.lastName;
    if (dto.phone !== undefined) employee.phone = dto.phone;
    if (dto.position !== undefined) employee.position = dto.position;
    if (dto.hireDate !== undefined) employee.hire_date = dto.hireDate;
    if (dto.status !== undefined) employee.status = dto.status;

    if (dto.supervisorId) {
      employee.supervisor = await this.findOne(dto.supervisorId);
    }
    if (dto.scheduleId) {
      employee.schedule = await this.findScheduleOrFail(dto.scheduleId);
    }

    return this.employeeRepository.save(employee);
  }
}
