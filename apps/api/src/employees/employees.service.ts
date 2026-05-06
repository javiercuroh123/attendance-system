import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';
import { RoleCode } from '../common/enums/role-code.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
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
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  private isSupervisorScopedUser(currentUser: AuthenticatedUser) {
    return (
      currentUser.roles.includes(RoleCode.SUPERVISOR) &&
      !currentUser.roles.includes(RoleCode.ADMIN) &&
      !currentUser.roles.includes(RoleCode.RRHH)
    );
  }

  private isEmployeeScopedUser(currentUser: AuthenticatedUser) {
    return (
      currentUser.roles.includes(RoleCode.EMPLOYEE) &&
      !currentUser.roles.includes(RoleCode.ADMIN) &&
      !currentUser.roles.includes(RoleCode.RRHH) &&
      !currentUser.roles.includes(RoleCode.SUPERVISOR)
    );
  }

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

  async findAll(currentUser?: AuthenticatedUser) {
    if (currentUser && this.isSupervisorScopedUser(currentUser)) {
      const supervisor = await this.findByUserId(currentUser.userId);

      return this.employeeRepository.find({
        where: [{ supervisor: { id: supervisor.id } }, { id: supervisor.id }],
        relations: ['user', 'supervisor', 'schedule'],
        order: { first_name: 'ASC' },
      });
    }

    return this.employeeRepository.find({
      relations: ['user', 'supervisor', 'schedule'],
      order: { first_name: 'ASC' },
    });
  }

  async findOne(id: string, currentUser?: AuthenticatedUser) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['user', 'supervisor', 'schedule'],
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    if (currentUser && this.isSupervisorScopedUser(currentUser)) {
      const supervisor = await this.findByUserId(currentUser.userId);
      const isOwnRecord = employee.id === supervisor.id;
      const isTeamRecord = employee.supervisor?.id === supervisor.id;

      if (!isOwnRecord && !isTeamRecord) {
        throw new ForbiddenException(
          'Solo puedes consultar empleados de tu equipo asignado',
        );
      }
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

  async findAttendanceByEmployeeId(
    id: string,
    currentUser: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    const employee = await this.findOne(id, currentUser);

    if (this.isEmployeeScopedUser(currentUser)) {
      const ownEmployee = await this.findByUserId(currentUser.userId);
      if (ownEmployee.id !== employee.id) {
        throw new ForbiddenException('Solo puedes consultar tu propia asistencia');
      }
    }

    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .leftJoinAndSelect('attendance.qr_session', 'qrSession')
      .where('employee.id = :employeeId', { employeeId: employee.id })
      .orderBy('attendance.attendance_date', 'DESC');

    if (query.from) {
      qb.andWhere('attendance.attendance_date >= :from', { from: query.from });
    }

    if (query.to) {
      qb.andWhere('attendance.attendance_date <= :to', { to: query.to });
    }

    if (query.status) {
      qb.andWhere('attendance.status = :status', { status: query.status });
    }

    const rawLimit = query.limit ? Number(query.limit) : 120;
    const safeLimit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 365)
      : 120;
    qb.take(safeLimit);

    return qb.getMany();
  }
}
