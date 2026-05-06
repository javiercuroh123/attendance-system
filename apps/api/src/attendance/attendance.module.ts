import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Employee } from '../employees/entities/employee.entity';
import { QrModule } from '../qr/qr.module';
import { SettingsModule } from '../settings/settings.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendanceRecord } from './entities/attendance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AttendanceRecord, Employee]),
    QrModule,
    AuditModule,
    SettingsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
