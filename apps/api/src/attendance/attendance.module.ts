import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Employee } from '../employees/entities/employee.entity';
import { QrModule } from '../qr/qr.module';
import { EmployeeScheduleAssignment } from '../schedules/entities/employee-schedule-assignment.entity';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceEvent } from './entities/attendance-event.entity';
import { AttendanceRecord } from './entities/attendance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AttendanceRecord,
      AttendanceEvent,
      Employee,
      EmployeeScheduleAssignment,
    ]),
    QrModule,
    AuditModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
