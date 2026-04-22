import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AttendanceEventType } from '../common/enums/attendance-event-type.enum';
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
import { EmployeeScheduleAssignment } from '../schedules/entities/employee-schedule-assignment.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { ManualAdjustmentDto } from './dto/manual-adjustment.dto';
import { AttendanceEvent } from './entities/attendance-event.entity';
import { AttendanceRecord } from './entities/attendance.entity';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(AttendanceEvent)
    private readonly eventRepository: Repository<AttendanceEvent>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(EmployeeScheduleAssignment)
    private readonly assignmentRepository: Repository<EmployeeScheduleAssignment>,
    private readonly qrService: QrService,
    private readonly auditService: AuditService,
  ) {}

  private async getEmployeeByUserId(userId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'area', 'supervisor'],
    });

    if (!employee) {
      throw new NotFoundException(
        'No existe empleado vinculado al usuario autenticado',
      );
    }

    return employee;
  }

  private async getActiveSchedule(employeeId: string, attendanceDate: string) {
    const assignments = await this.assignmentRepository.find({
      where: { employee: { id: employeeId }, status: 'ACTIVE' },
      relations: ['schedule'],
      order: { valid_from: 'DESC' },
    });

    const assignment = assignments.find((item) => {
      const starts = item.valid_from <= attendanceDate;
      const ends = !item.valid_to || item.valid_to >= attendanceDate;
      return starts && ends;
    });

    if (!assignment) {
      throw new BadRequestException(
        'El empleado no tiene horario activo asignado',
      );
    }

    return assignment.schedule;
  }

  async check(dto: CreateAttendanceDto, currentUser: AuthenticatedUser) {
    const qrSession = await this.qrService.findActiveSessionByToken(dto.qrToken);
    const employee = await this.getEmployeeByUserId(currentUser.userId);
    const now = new Date();
    const today = toIsoDate(now);

    if (!employee.area) {
      throw new BadRequestException('El empleado no tiene area asignada');
    }

    const schedule = await this.getActiveSchedule(employee.id, today);

    let record = await this.attendanceRepository.findOne({
      where: { employee: { id: employee.id }, attendance_date: today },
      relations: ['employee', 'qr_session'],
    });

    if (!record) {
      const scheduledStart = combineDateAndTime(now, schedule.start_time);
      const lateThreshold = new Date(
        scheduledStart.getTime() + schedule.tolerance_minutes * 60000,
      );
      const lateMinutes =
        now > lateThreshold ? diffMinutes(now, lateThreshold) : 0;
      const status =
        lateMinutes > 0 ? AttendanceStatus.LATE : AttendanceStatus.ON_TIME;

      record = this.attendanceRepository.create({
        employee,
        attendance_date: today,
        check_in_at: now,
        status,
        late_minutes: lateMinutes,
        source: 'APP_MOBILE',
        qr_session: qrSession,
        device_info: dto.deviceInfo ?? null,
      });

      record = await this.attendanceRepository.save(record);
      await this.eventRepository.save(
        this.eventRepository.create({
          attendance_record: record,
          event_type: AttendanceEventType.CHECK_IN,
          event_at: now,
          qr_session: qrSession,
          payload_json: {
            deviceTime: dto.deviceTime ?? null,
            deviceInfo: dto.deviceInfo ?? null,
          },
        }),
      );

      return {
        success: true,
        attendanceType: AttendanceEventType.CHECK_IN,
        status,
        lateMinutes,
        serverTime: now,
        recordId: record.id,
      };
    }

    if (!record.check_out_at) {
      record.check_out_at = now;
      record.status =
        record.late_minutes > 0
          ? AttendanceStatus.LATE
          : AttendanceStatus.COMPLETE;
      record.qr_session = qrSession;
      record.device_info = dto.deviceInfo ?? record.device_info ?? null;
      record = await this.attendanceRepository.save(record);

      await this.eventRepository.save(
        this.eventRepository.create({
          attendance_record: record,
          event_type: AttendanceEventType.CHECK_OUT,
          event_at: now,
          qr_session: qrSession,
          payload_json: {
            deviceTime: dto.deviceTime ?? null,
            deviceInfo: dto.deviceInfo ?? null,
          },
        }),
      );

      return {
        success: true,
        attendanceType: AttendanceEventType.CHECK_OUT,
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
      relations: ['employee', 'employee.area'],
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
      .leftJoinAndSelect('employee.area', 'area')
      .orderBy('attendance.attendance_date', 'DESC');

    if (query.from)
      qb.andWhere('attendance.attendance_date >= :from', { from: query.from });
    if (query.to)
      qb.andWhere('attendance.attendance_date <= :to', { to: query.to });
    if (query.areaId) qb.andWhere('area.id = :areaId', { areaId: query.areaId });
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
      relations: ['employee', 'employee.user', 'employee.area', 'qr_session'],
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
    const previous = {
      checkInAt: record.check_in_at?.toISOString() ?? null,
      checkOutAt: record.check_out_at?.toISOString() ?? null,
      status: record.status,
    };

    if (dto.checkInAt) record.check_in_at = new Date(dto.checkInAt);
    if (dto.checkOutAt) record.check_out_at = new Date(dto.checkOutAt);
    record.status = AttendanceStatus.COMPLETE;
    record = await this.attendanceRepository.save(record);

    await this.eventRepository.save(
      this.eventRepository.create({
        attendance_record: record,
        event_type: AttendanceEventType.MANUAL_ADJUSTMENT,
        event_at: new Date(),
        payload_json: {
          reason: dto.reason,
          checkInAt: dto.checkInAt ?? null,
          checkOutAt: dto.checkOutAt ?? null,
        },
      }),
    );

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
        status: record.status,
        reason: dto.reason,
      },
    });

    return record;
  }
}
