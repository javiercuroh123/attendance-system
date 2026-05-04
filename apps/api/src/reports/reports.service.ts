import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
  ) {}

  async daily(query: Record<string, string | undefined>) {
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

    const rows = await qb.getMany();
    return {
      total: rows.length,
      rows,
    };
  }

  async monthly(query: Record<string, string | undefined>) {
    const year = Number(query.year ?? new Date().getFullYear());
    const month = Number(query.month ?? new Date().getMonth() + 1);
    const from = `${year}-${String(month).padStart(2, '0')}-01`;
    const to = `${year}-${String(month).padStart(2, '0')}-31`;

    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.attendance_date BETWEEN :from AND :to', { from, to });

    if (query.areaName)
      qb.andWhere('employee.area_name ILIKE :areaName', {
        areaName: `%${query.areaName}%`,
      });

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
      year,
      month,
      totalEmployees: summary.size,
      rows: Array.from(summary.values()),
    };
  }

  async late(query: Record<string, string | undefined>) {
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

    const rows = await qb.getMany();
    return {
      total: rows.length,
      rows,
    };
  }

  async absences(query: Record<string, string | undefined>) {
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

    const rows = await qb.getMany();

    return {
      total: rows.length,
      rows,
    };
  }

  async export(query: Record<string, string | undefined>) {
    const reportType = query.type ?? 'daily';
    const dataset =
      reportType === 'monthly'
        ? await this.monthly(query)
        : reportType === 'late'
          ? await this.late(query)
          : reportType === 'absences'
            ? await this.absences(query)
            : await this.daily(query);

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
