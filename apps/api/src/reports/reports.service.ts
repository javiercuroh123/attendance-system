import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';
import { RoleCode } from '../common/enums/role-code.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Employee } from '../employees/entities/employee.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  private isSupervisorScopedUser(currentUser: AuthenticatedUser) {
    return (
      currentUser.roles.includes(RoleCode.SUPERVISOR) &&
      !currentUser.roles.includes(RoleCode.ADMIN) &&
      !currentUser.roles.includes(RoleCode.RRHH)
    );
  }

  private async applySupervisorScope(
    qb: SelectQueryBuilder<AttendanceRecord>,
    currentUser: AuthenticatedUser,
  ) {
    if (!this.isSupervisorScopedUser(currentUser)) {
      return;
    }

    const supervisor = await this.employeeRepository.findOne({
      where: { user: { id: currentUser.userId } },
    });

    if (!supervisor) {
      qb.andWhere('1 = 0');
      return;
    }

    qb.andWhere(
      '(employee.supervisor_id = :supervisorId OR employee.id = :supervisorId)',
      { supervisorId: supervisor.id },
    );
  }

  private buildMonthRange(year: number, month: number) {
    const fallback = new Date();
    const safeYear =
      Number.isFinite(year) && year >= 2000 ? year : fallback.getFullYear();
    const safeMonthInput = Number.isFinite(month) ? month : fallback.getMonth() + 1;
    const safeMonth = Math.min(Math.max(safeMonthInput, 1), 12);
    const daysInMonth = new Date(safeYear, safeMonth, 0).getDate();
    const monthText = String(safeMonth).padStart(2, '0');

    return {
      year: safeYear,
      month: safeMonth,
      from: `${safeYear}-${monthText}-01`,
      to: `${safeYear}-${monthText}-${String(daysInMonth).padStart(2, '0')}`,
    };
  }

  async daily(
    currentUser: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .orderBy('employee.last_name', 'ASC');

    if (query.date)
      qb.andWhere('attendance.attendance_date = :date', { date: query.date });
    if (query.areaName)
      qb.andWhere('employee.area_name ILIKE :areaName', {
        areaName: `%${query.areaName}%`,
      });
    if (query.employeeId)
      qb.andWhere('employee.id = :employeeId', { employeeId: query.employeeId });
    if (query.status)
      qb.andWhere('attendance.status = :status', { status: query.status });

    await this.applySupervisorScope(qb, currentUser);

    const rows = await qb.getMany();
    return {
      total: rows.length,
      rows,
    };
  }

  async monthly(
    currentUser: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    const year = Number(query.year ?? new Date().getFullYear());
    const month = Number(query.month ?? new Date().getMonth() + 1);
    const range = this.buildMonthRange(year, month);

    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.attendance_date BETWEEN :from AND :to', {
        from: range.from,
        to: range.to,
      });

    if (query.areaName)
      qb.andWhere('employee.area_name ILIKE :areaName', {
        areaName: `%${query.areaName}%`,
      });

    await this.applySupervisorScope(qb, currentUser);

    const rows = await qb.getMany();

    const summary = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        areaName: string;
        present: number;
        late: number;
        incomplete: number;
        absent: number;
      }
    >();

    for (const row of rows) {
      const key = row.employee.id;
      const existing = summary.get(key) ?? {
        employeeId: row.employee.id,
        employeeName: `${row.employee.first_name} ${row.employee.last_name}`,
        areaName: row.employee.area_name ?? 'Sin area',
        present: 0,
        late: 0,
        incomplete: 0,
        absent: 0,
      };

      if (row.status === 'PRESENT') existing.present += 1;
      if (row.status === 'LATE') existing.late += 1;
      if (row.status === 'INCOMPLETE') existing.incomplete += 1;
      if (row.status === 'ABSENT') existing.absent += 1;
      summary.set(key, existing);
    }

    return {
      year: range.year,
      month: range.month,
      totalEmployees: summary.size,
      rows: Array.from(summary.values()),
    };
  }

  async late(
    currentUser: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.late_minutes > 0')
      .orderBy('attendance.attendance_date', 'DESC');

    if (query.from)
      qb.andWhere('attendance.attendance_date >= :from', { from: query.from });
    if (query.to)
      qb.andWhere('attendance.attendance_date <= :to', { to: query.to });
    if (query.areaName)
      qb.andWhere('employee.area_name ILIKE :areaName', {
        areaName: `%${query.areaName}%`,
      });

    await this.applySupervisorScope(qb, currentUser);

    const rows = await qb.getMany();
    return {
      total: rows.length,
      rows,
    };
  }

  async absences(
    currentUser: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.status = :status', { status: 'ABSENT' })
      .orderBy('attendance.attendance_date', 'DESC');

    if (query.from)
      qb.andWhere('attendance.attendance_date >= :from', { from: query.from });
    if (query.to)
      qb.andWhere('attendance.attendance_date <= :to', { to: query.to });
    if (query.areaName)
      qb.andWhere('employee.area_name ILIKE :areaName', {
        areaName: `%${query.areaName}%`,
      });

    await this.applySupervisorScope(qb, currentUser);

    const rows = await qb.getMany();

    return {
      total: rows.length,
      rows,
    };
  }

  async export(
    currentUser: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    const reportType = query.type ?? 'daily';
    const dataset =
      reportType === 'monthly'
        ? await this.monthly(currentUser, query)
        : reportType === 'late'
          ? await this.late(currentUser, query)
          : reportType === 'absences'
            ? await this.absences(currentUser, query)
            : await this.daily(currentUser, query);

    const rows = Array.isArray((dataset as Record<string, unknown>).rows)
      ? ((dataset as Record<string, unknown>).rows as Array<
          Record<string, unknown>
        >)
      : [];

    const csv = rows.length
      ? [
          Object.keys(rows[0]).join(','),
          ...rows.map((row) =>
            Object.values(row)
              .map((value) => JSON.stringify(value ?? ''))
              .join(','),
          ),
        ].join('\n')
      : 'message\n"No data"';

    return {
      type: reportType,
      format: 'csv',
      filename: `report-${reportType}.csv`,
      content: csv,
    };
  }
}
