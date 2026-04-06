import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidentRequest } from '../incidents/entities/incident.entity';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AttendanceRecord)
    private readonly attendanceRepository: Repository<AttendanceRecord>,
    @InjectRepository(IncidentRequest)
    private readonly incidentRepository: Repository<IncidentRequest>,
  ) {}

  async daily(query: Record<string, string | undefined>) {
    const qb = this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .leftJoinAndSelect('attendance.branch', 'branch')
      .leftJoinAndSelect('employee.project', 'project')
      .orderBy('employee.last_name', 'ASC');

    if (query.date)
      qb.andWhere('attendance.attendance_date = :date', { date: query.date });
    if (query.branchId)
      qb.andWhere('branch.id = :branchId', { branchId: query.branchId });
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

    const rows = await this.attendanceRepository
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.employee', 'employee')
      .where('attendance.attendance_date BETWEEN :from AND :to', { from, to })
      .getMany();

    const summary = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        onTime: number;
        late: number;
        complete: number;
      }
    >();

    for (const row of rows) {
      const key = row.employee.id;
      const existing = summary.get(key) ?? {
        employeeId: row.employee.id,
        employeeName: `${row.employee.first_name} ${row.employee.last_name}`,
        onTime: 0,
        late: 0,
        complete: 0,
      };

      if (row.status === 'ON_TIME') existing.onTime += 1;
      if (row.status === 'LATE') existing.late += 1;
      if (row.check_out_at) existing.complete += 1;
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
      .leftJoinAndSelect('attendance.branch', 'branch')
      .where('attendance.late_minutes > 0')
      .orderBy('attendance.attendance_date', 'DESC');

    if (query.from)
      qb.andWhere('attendance.attendance_date >= :from', { from: query.from });
    if (query.to)
      qb.andWhere('attendance.attendance_date <= :to', { to: query.to });

    const rows = await qb.getMany();
    return {
      total: rows.length,
      rows,
    };
  }

  async absences(query: Record<string, string | undefined>) {
    const incidents = await this.incidentRepository.find({
      where: query.attendanceDate
        ? { attendance_date: query.attendanceDate }
        : {},
      relations: ['employee'],
      order: { attendance_date: 'DESC' },
    });

    const rows = incidents.filter((item) =>
      item.request_type.toUpperCase().includes('ABSENCE'),
    );
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
