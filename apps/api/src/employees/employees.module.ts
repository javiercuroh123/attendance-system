import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Area } from '../areas/entities/area.entity';
import { AuditModule } from '../audit/audit.module';
import { EmployeeScheduleAssignment } from '../schedules/entities/employee-schedule-assignment.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { User } from '../users/entities/user.entity';
import { Employee } from './entities/employee.entity';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      User,
      Area,
      EmployeeScheduleAssignment,
      Schedule,
    ]),
    AuditModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
