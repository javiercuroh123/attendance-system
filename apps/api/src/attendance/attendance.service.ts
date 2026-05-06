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
import { Employee } from '../employees/entities/employee.entity';
import { QrService } from '../qr/qr.service';
import { SettingsService } from '../settings/settings.service';
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
    private readonly settingsService: SettingsService,
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

  private async getDefaultTimezone() {
    try {
      const settings = await this.settingsService.getActive();
      const timezone = settings.default_timezone?.trim();
      return timezone || 'America/Lima';
    } catch {
      return 'America/Lima';
    }
  }

  private getDateTimePartsInTimezone(date: Date, timezone: string) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(date);
    const find = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((item) => item.type === type)?.value ?? '00';

    return {
      year: Number(find('year')),
      month: Number(find('month')),
      day: Number(find('day')),
      hours: Number(find('hour')),
      minutes: Number(find('minute')),
      seconds: Number(find('second')),
    };
  }

  private getAttendanceDateForTimezone(date: Date, timezone: string): string {
    const parts = this.getDateTimePartsInTimezone(date, timezone);
    return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(
      parts.day,
    ).padStart(2, '0')}`;
  }

  private parseTimeToTotalSeconds(time: string): number {
    const [hoursRaw, minutesRaw, secondsRaw = '0'] = time.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    const seconds = Number(secondsRaw);
    return hours * 3600 + minutes * 60 + seconds;
  }

  private isSupervisorScopedUser(currentUser: AuthenticatedUser) {
    return (
      currentUser.roles.includes(RoleCode.SUPERVISOR) &&
      !currentUser.roles.includes(RoleCode.ADMIN) &&
      !currentUser.roles.includes(RoleCode.RRHH)
    );
  }

  private calculateLateStatus(
    checkInTime: Date,
    startTime: string,
    toleranceMinutes: number,
    timezone: string,
  ) {
    const checkInParts = this.getDateTimePartsInTimezone(checkInTime, timezone);
    const currentTotalSeconds =
      checkInParts.hours * 3600 + checkInParts.minutes * 60 + checkInParts.seconds;

    const scheduledTotalSeconds =
      this.parseTimeToTotalSeconds(startTime) + toleranceMinutes * 60;

    const lateMinutes =
      currentTotalSeconds > scheduledTotalSeconds
        ? Math.floor((currentTotalSeconds - scheduledTotalSeconds) / 60)
        : 0;

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
    const timezone = await this.getDefaultTimezone();
    const today = this.getAttendanceDateForTimezone(now, timezone);
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
        timezone,
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

    if (this.isSupervisorScopedUser(currentUser)) {
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
      relations: [
        'employee',
        'employee.user',
        'employee.schedule',
        'employee.supervisor',
        'qr_session',
      ],
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

    if (this.isSupervisorScopedUser(currentUser)) {
      const supervisorEmployee = await this.getEmployeeByUserId(
        currentUser.userId,
      );

      const isOwnRecord = record.employee.id === supervisorEmployee.id;
      const isTeamRecord = record.employee.supervisor?.id === supervisorEmployee.id;

      if (!isOwnRecord && !isTeamRecord) {
        throw new ForbiddenException(
          'Solo puedes ver asistencia de tu equipo asignado',
        );
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
    const timezone = await this.getDefaultTimezone();
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
        timezone,
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
