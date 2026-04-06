import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from '../branches/entities/branch.entity';
import { Client } from '../clients/entities/client.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async create(dto: CreateProjectDto) {
    const project = this.projectRepository.create({
      name: dto.name,
      status: dto.status ?? 'ACTIVE',
    });

    if (dto.clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: dto.clientId },
      });
      if (!client) throw new NotFoundException('Cliente no encontrado');
      project.client = client;
    }

    if (dto.branchId) {
      const branch = await this.branchRepository.findOne({
        where: { id: dto.branchId },
      });
      if (!branch) throw new NotFoundException('Sede no encontrada');
      project.branch = branch;
    }

    return this.projectRepository.save(project);
  }

  findAll() {
    return this.projectRepository.find({
      relations: ['client', 'branch'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['client', 'branch'],
    });
    if (!project) {
      throw new NotFoundException('Proyecto no encontrado');
    }
    return project;
  }

  async update(id: string, dto: UpdateProjectDto) {
    const project = await this.findOne(id);
    if (dto.clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: dto.clientId },
      });
      if (!client) throw new NotFoundException('Cliente no encontrado');
      project.client = client;
    }
    if (dto.branchId) {
      const branch = await this.branchRepository.findOne({
        where: { id: dto.branchId },
      });
      if (!branch) throw new NotFoundException('Sede no encontrada');
      project.branch = branch;
    }
    if (dto.name !== undefined) project.name = dto.name;
    if (dto.status !== undefined) project.status = dto.status;
    return this.projectRepository.save(project);
  }
}
