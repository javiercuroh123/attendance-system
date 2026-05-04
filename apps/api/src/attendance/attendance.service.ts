import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AttendanceStatus } from '../common/enums/attendance-status.enum';
import { RoleCode } from '../common/enums/role-code.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import {
  combineDateAndTime,
  diffMinutes,
  toIsoDate,
} from '../common/utils/date.utils';
import { Employee } from '../employees/entities/employee.entity';
import { QrService } from '../qr/qr.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto';
import { AttendanceRecord } from './entities/attendance.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    private readonly qrService: QrService,
    private readonly auditService: AuditService,
  ) {}

  private async getEmployeeByUserId(userId: string) {
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

  private getScheduleOrFail(employee: Employee) {
    if (!employee.schedule) {
      throw new BadRequestException(
        'El empleado no tiene horario activo asignado',
      );
    }
    return employee.schedule;
  }

  private calculateLateStatus(
    checkInTime: Date,
    startTime: string,
    toleranceMinutes: number,
  ) {
    const scheduledStart = combineDateAndTime(checkInTime, startTime);
    const lateThreshold = new Date(
      scheduledStart.getTime() + toleranceMinutes * 60000,
    );
    const lateMinutes =
      checkInTime > lateThreshold ? diffMinutes(checkInTime, lateThreshold) : 0;
    return {
      lateMinutes,
      status:
        lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.INCOMPLETE,
    };
  }

  async check(dto: CreateAttendanceDto, currentUser: AuthenticatedUser) {
    const qrSession = await this.qrService.findActiveSessionByToken(dto.qrToken);
    const employee = await this.getEmployeeByUserId(currentUser.userId);
    const now = new Date();
    const today = toIsoDate(now);
    const schedule = this.getScheduleOrFail(employee);

    let record = await this.attendanceRepository.findOne({
      where: { employee: { id: employee.id }, attendance_date: today },
      relations: ['employee', 'qr_session'],
    });

    if (!record) {
      const { lateMinutes, status } = this.calculateLateStatus(
        now,
        schedule.start_time,
        schedule.tolerance_minutes,
      );

      record = this.attendanceRepository.create({
        employee,
        attendance_date: today,
        check_in_at: now,
        status,
        late_minutes: lateMinutes,
        source: 'QR',
        qr_session: qrSession,
        device_info: dto.deviceInfo ?? null,
      });

      record = await this.attendanceRepository.save(record);

      return {
        success: true,
        attendanceType: 'CHECK_IN',
        status,
        lateMinutes,
        serverTime: now,
        recordId: record.id,
      };
    }

    if (!record.check_out_at) {
      record.check_out_at = now;
      record.status =
        record.late_minutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.PRESENT;
      record.qr_session = qrSession;
      record.device_info = dto.deviceInfo ?? record.device_info ?? null;
      record = await this.attendanceRepository.save(record);

      return {
        success: true,
        attendanceType: 'CHECK_OUT',
        status: record.status,
        lateMinutes: record.late_minutes,
        serverTime: now,
        recordId: record.id,
      };
    }

    throw new BadRequestException(
      'Ya existen una entrada y una salida registradas para hoy',
    );
  }

  async findMyAttendance(currentUser: AuthenticatedUser) {
    const employee = await this.getEmployeeByUserId(currentUser.userId);
    return this.attendanceRepository.find({
      where: { employee: { id: employee.id } },
      relations: ['employee', 'employee.schedule'],
      order: { attendance_date: 'DESC' },
      take: 90,
    });
  }

  async findAll(
    currentUser: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .orderBy('attendance.attendance_date', 'DESC');

    if (query.from)
      qb.andWhere('attendance.attendance_date >= :from', { from: query.from });
    if (query.to)
      qb.andWhere('attendance.attendance_date <= :to', { to: query.to });
    if (query.areaName)
      qb.andWhere('employee.area_name ILIKE :areaName', {
        areaName: `%${query.areaName}%`,
      });
    if (query.employeeId)
      qb.andWhere('employee.id = :employeeId', {
        employeeId: query.employeeId,
      });
    if (query.status)
      qb.andWhere('attendance.status = :status', { status: query.status });

    if (
      currentUser.roles.includes(RoleCode.SUPERVISOR) &&
      !currentUser.roles.includes(RoleCode.ADMIN) &&
      !currentUser.roles.includes(RoleCode.RRHH)
    ) {
      const supervisorEmployee = await this.getEmployeeByUserId(
        currentUser.userId,
      );
      qb.andWhere('employee.supervisor_id = :supervisorId', {
        supervisorId: supervisorEmployee.id,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const record = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.user', 'employee.schedule', 'qr_session'],
    });

    if (!record) {
      throw new NotFoundException('Registro de asistencia no encontrado');
    }

    if (
      currentUser.roles.includes(RoleCode.EMPLOYEE) &&
      !currentUser.roles.includes(RoleCode.ADMIN) &&
      !currentUser.roles.includes(RoleCode.RRHH) &&
      !currentUser.roles.includes(RoleCode.SUPERVISOR)
    ) {
      if (record.employee.user.id !== currentUser.userId) {
        throw new ForbiddenException('Solo puedes ver tu propia asistencia');
      }
    }

    return record;
  }

  async manualAdjustment(
    id: string,
    dto: ManualAdjustmentDto,
    currentUser: AuthenticatedUser,
  ) {
    let record = await this.findOne(id, currentUser);
    const schedule = record.employee.schedule;
    const previous = {
      checkInAt: record.check_in_at?.toISOString() ?? null,
      checkOutAt: record.check_out_at?.toISOString() ?? null,
      lateMinutes: record.late_minutes,
      status: record.status,
    };

    if (dto.checkInAt) record.check_in_at = new Date(dto.checkInAt);
    if (dto.checkOutAt) record.check_out_at = new Date(dto.checkOutAt);
    record.source = 'MANUAL';

    if (!record.check_in_at) {
      record.late_minutes = 0;
      record.status = AttendanceStatus.ABSENT;
    } else if (schedule) {
      const outcome = this.calculateLateStatus(
        record.check_in_at,
        schedule.start_time,
        schedule.tolerance_minutes,
      );
      record.late_minutes = outcome.lateMinutes;
      record.status = record.check_out_at ? AttendanceStatus.PRESENT : outcome.status;
      if (outcome.lateMinutes > 0) {
        record.status = AttendanceStatus.LATE;
      }
    } else {
      record.late_minutes = 0;
      record.status = record.check_out_at
        ? AttendanceStatus.PRESENT
        : AttendanceStatus.INCOMPLETE;
    }

    record = await this.attendanceRepository.save(record);

    await this.auditService.create({
      actorUserId: currentUser.userId,
      module: 'attendance',
      action: 'MANUAL_ADJUSTMENT',
      entityName: 'attendance_records',
      entityId: id,
      oldData: previous,
      newData: {
        checkInAt: record.check_in_at?.toISOString() ?? null,
        checkOutAt: record.check_out_at?.toISOString() ?? null,
        lateMinutes: record.late_minutes,
        status: record.status,
        reason: dto.reason,
      },
    });

    return record;
  }
}
