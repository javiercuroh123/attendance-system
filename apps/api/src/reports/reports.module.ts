import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../attendance/entities/attendance.entity';
import { IncidentRequest } from '../incidents/entities/incident.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([AttendanceRecord, IncidentRequest])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
