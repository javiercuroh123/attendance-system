import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Client } from '../clients/entities/client.entity';
import { Project } from '../projects/entities/project.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { EmployeeScheduleAssignment } from '../schedules/entities/employee-schedule-assignment.entity';
import { User } from '../users/entities/user.entity';
import { AssignScheduleDto } from './dto/assign-schedule.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(EmployeeScheduleAssignment)
    private readonly assignmentRepository: Repository<EmployeeScheduleAssignment>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async create(dto: CreateEmployeeDto) {
    const user = await this.userRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const sameCode = await this.employeeRepository.findOne({
      where: { code: dto.code },
    });
    if (sameCode)
      throw new ConflictException('El código de empleado ya existe');

    const sameDni = await this.employeeRepository.findOne({
      where: { dni: dto.dni },
    });
    if (sameDni) throw new ConflictException('El DNI ya existe');

    const employee = this.employeeRepository.create({
      user,
      code: dto.code,
      dni: dto.dni,
      first_name: dto.firstName,
      last_name: dto.lastName,
      phone: dto.phone,
      area: dto.area,
      position: dto.position,
      hire_date: dto.hireDate,
      status: dto.status ?? 'ACTIVE',
    });

    if (dto.supervisorId) {
      employee.supervisor = await this.findOne(dto.supervisorId);
    }
    if (dto.branchId) {
      const branch = await this.branchRepository.findOne({
        where: { id: dto.branchId },
      });
      if (!branch) throw new NotFoundException('Sede no encontrada');
      employee.branch = branch;
    }
    if (dto.clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: dto.clientId },
      });
      if (!client) throw new NotFoundException('Cliente no encontrado');
      employee.client = client;
    }
    if (dto.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: dto.projectId },
      });
      if (!project) throw new NotFoundException('Proyecto no encontrado');
      employee.project = project;
    }

    return this.employeeRepository.save(employee);
  }

  findAll() {
    return this.employeeRepository.find({
      relations: ['user', 'supervisor', 'branch', 'client', 'project'],
      order: { first_name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const employee = await this.employeeRepository.findOne({
      where: { id },
      relations: ['user', 'supervisor', 'branch', 'client', 'project'],
    });

    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }

    return employee;
  }

  async findByUserId(userId: string) {
    const employee = await this.employeeRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user', 'supervisor', 'branch', 'client', 'project'],
    });
    if (!employee) {
      throw new NotFoundException(
        'No existe empleado vinculado al usuario autenticado',
      );
    }
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.findOne(id);

    if (dto.userId) {
      const user = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
      if (!user) throw new NotFoundException('Usuario no encontrado');
      employee.user = user;
    }
    if (dto.code !== undefined) employee.code = dto.code;
    if (dto.dni !== undefined) employee.dni = dto.dni;
    if (dto.firstName !== undefined) employee.first_name = dto.firstName;
    if (dto.lastName !== undefined) employee.last_name = dto.lastName;
    if (dto.phone !== undefined) employee.phone = dto.phone;
    if (dto.area !== undefined) employee.area = dto.area;
    if (dto.position !== undefined) employee.position = dto.position;
    if (dto.hireDate !== undefined) employee.hire_date = dto.hireDate;
    if (dto.status !== undefined) employee.status = dto.status;

    if (dto.supervisorId) {
      employee.supervisor = await this.findOne(dto.supervisorId);
    }
    if (dto.branchId) {
      const branch = await this.branchRepository.findOne({
        where: { id: dto.branchId },
      });
      if (!branch) throw new NotFoundException('Sede no encontrada');
      employee.branch = branch;
    }
    if (dto.clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: dto.clientId },
      });
      if (!client) throw new NotFoundException('Cliente no encontrado');
      employee.client = client;
    }
    if (dto.projectId) {
      const project = await this.projectRepository.findOne({
        where: { id: dto.projectId },
      });
      if (!project) throw new NotFoundException('Proyecto no encontrado');
      employee.project = project;
    }

    return this.employeeRepository.save(employee);
  }

  async getSchedules(employeeId: string) {
    await this.findOne(employeeId);
    return this.assignmentRepository.find({
      where: { employee: { id: employeeId } },
      relations: ['schedule'],
      order: { valid_from: 'DESC' },
    });
  }

  async assignSchedule(employeeId: string, dto: AssignScheduleDto) {
    const employee = await this.findOne(employeeId);
    const schedule = await this.scheduleRepository.findOne({
      where: { id: dto.scheduleId },
    });
    if (!schedule) {
      throw new NotFoundException('Horario no encontrado');
    }

    const assignment = this.assignmentRepository.create({
      employee,
      schedule,
      valid_from: dto.validFrom,
      valid_to: dto.validTo ?? null,
      status: dto.status ?? 'ACTIVE',
    });

    return this.assignmentRepository.save(assignment);
  }
}
