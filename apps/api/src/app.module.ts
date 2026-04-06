import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesPermissionsModule } from './roles-permissions/roles-permissions.module';
import { ClientsModule } from './clients/clients.module';
import { BranchesModule } from './branches/branches.module';
import { ProjectsModule } from './projects/projects.module';
import { SchedulesModule } from './schedules/schedules.module';
import { EmployeesModule } from './employees/employees.module';
import { QrModule } from './qr/qr.module';
import { AttendanceModule } from './attendance/attendance.module';
import { IncidentsModule } from './incidents/incidents.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USER', 'postgres'),
        password: configService.get<string>('DB_PASSWORD', 'postgres'),
        database: configService.get<string>('DB_NAME', 'attendance_db'),
        autoLoadEntities: true,
        synchronize:
          configService.get<string>('DB_SYNCHRONIZE', 'false') === 'true',
        logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
      }),
    }),
    AuthModule,
    UsersModule,
    RolesPermissionsModule,
    ClientsModule,
    BranchesModule,
    ProjectsModule,
    SchedulesModule,
    EmployeesModule,
    QrModule,
    AttendanceModule,
    IncidentsModule,
    AuditModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
