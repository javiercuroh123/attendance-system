import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { RoleCode } from '../common/enums/role-code.enum';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Employee } from '../employees/entities/employee.entity';
import { User } from '../users/entities/user.entity';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ResolveIncidentDto } from './dto/resolve-incident.dto';
import { IncidentRequest } from './entities/incident.entity';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(IncidentRequest)
    private readonly incidentRepository: Repository<IncidentRequest>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly auditService: AuditService,
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

  async create(dto: CreateIncidentDto, currentUser: AuthenticatedUser) {
    const employee = await this.getEmployeeByUserId(currentUser.userId);
    const incident = this.incidentRepository.create({
      employee,
      attendance_date: dto.attendanceDate,
      request_type: dto.requestType,
      description: dto.description,
      status: 'PENDING',
    });
    const created = await this.incidentRepository.save(incident);
    await this.auditService.create({
      actorUserId: currentUser.userId,
      module: 'incidents',
      action: 'CREATE',
      entityName: 'incident_requests',
      entityId: created.id,
      newData: {
        attendanceDate: dto.attendanceDate,
        requestType: dto.requestType,
      },
    });
    return created;
  }

  findMe(currentUser: AuthenticatedUser) {
    return this.incidentRepository.find({
      where: { employee: { user: { id: currentUser.userId } } },
      relations: ['employee', 'employee.schedule'],
      order: { created_at: 'DESC' },
    });
  }

  async findAll(
    currentUser: AuthenticatedUser,
    query: Record<string, string | undefined>,
  ) {
    const qb = this.incidentRepository
      .createQueryBuilder('incident')
      .leftJoinAndSelect('incident.employee', 'employee')
      .leftJoinAndSelect('incident.reviewer', 'reviewer')
      .orderBy('incident.created_at', 'DESC');

    if (query.status)
      qb.andWhere('incident.status = :status', { status: query.status });
    if (query.employeeId)
      qb.andWhere('employee.id = :employeeId', {
        employeeId: query.employeeId,
      });
    if (query.areaName)
      qb.andWhere('employee.area_name ILIKE :areaName', {
        areaName: `%${query.areaName}%`,
      });
    if (query.attendanceDate)
      qb.andWhere('incident.attendance_date = :attendanceDate', {
        attendanceDate: query.attendanceDate,
      });

    if (
      currentUser.roles.includes(RoleCode.SUPERVISOR) &&
      !currentUser.roles.includes(RoleCode.ADMIN) &&
      !currentUser.roles.includes(RoleCode.RRHH)
    ) {
      const supervisor = await this.getEmployeeByUserId(currentUser.userId);
      qb.andWhere('employee.supervisor_id = :supervisorId', {
        supervisorId: supervisor.id,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string) {
    const incident = await this.incidentRepository.findOne({
      where: { id },
      relations: ['employee', 'employee.user', 'employee.schedule', 'reviewer'],
    });
    if (!incident) {
      throw new NotFoundException('Incidencia no encontrada');
    }
    return incident;
  }

  async approve(
    id: string,
    dto: ResolveIncidentDto,
    currentUser: AuthenticatedUser,
  ) {
    const incident = await this.findOne(id);
    const reviewer = await this.userRepository.findOne({
      where: { id: currentUser.userId },
    });
    if (!reviewer) {
      throw new NotFoundException('Usuario revisor no encontrado');
    }
    incident.status = 'APPROVED';
    incident.reviewer = reviewer;
    incident.reviewed_at = new Date();
    incident.resolution_note = dto.resolutionNote;
    const saved = await this.incidentRepository.save(incident);
    await this.auditService.create({
      actorUserId: currentUser.userId,
      module: 'incidents',
      action: 'APPROVE',
      entityName: 'incident_requests',
      entityId: id,
      newData: { status: saved.status, resolutionNote: dto.resolutionNote },
    });
    return saved;
  }

  async reject(
    id: string,
    dto: ResolveIncidentDto,
    currentUser: AuthenticatedUser,
  ) {
    const incident = await this.findOne(id);
    const reviewer = await this.userRepository.findOne({
      where: { id: currentUser.userId },
    });
    if (!reviewer) {
      throw new NotFoundException('Usuario revisor no encontrado');
    }
    incident.status = 'REJECTED';
    incident.reviewer = reviewer;
    incident.reviewed_at = new Date();
    incident.resolution_note = dto.resolutionNote;
    const saved = await this.incidentRepository.save(incident);
    await this.auditService.create({
      actorUserId: currentUser.userId,
      module: 'incidents',
      action: 'REJECT',
      entityName: 'incident_requests',
      entityId: id,
      newData: { status: saved.status, resolutionNote: dto.resolutionNote },
    });
    return saved;
  }
}
