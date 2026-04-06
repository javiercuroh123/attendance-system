import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(dto: CreateBranchDto) {
    const branch = this.branchRepository.create({
      name: dto.name,
      address: dto.address,
      latitude: dto.latitude ? Number(dto.latitude) : null,
      longitude: dto.longitude ? Number(dto.longitude) : null,
      status: dto.status ?? 'ACTIVE',
    });

    if (dto.clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: dto.clientId },
      });
      if (!client) {
        throw new NotFoundException('Cliente no encontrado');
      }
      branch.client = client;
    }

    return this.branchRepository.save(branch);
  }

  findAll() {
    return this.branchRepository.find({
      relations: ['client'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string) {
    const branch = await this.branchRepository.findOne({
      where: { id },
      relations: ['client'],
    });
    if (!branch) {
      throw new NotFoundException('Sede no encontrada');
    }
    return branch;
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.findOne(id);
    if (dto.clientId) {
      const client = await this.clientRepository.findOne({
        where: { id: dto.clientId },
      });
      if (!client) {
        throw new NotFoundException('Cliente no encontrado');
      }
      branch.client = client;
    }
    if (dto.name !== undefined) branch.name = dto.name;
    if (dto.address !== undefined) branch.address = dto.address;
    if (dto.latitude !== undefined)
      branch.latitude = dto.latitude ? Number(dto.latitude) : null;
    if (dto.longitude !== undefined)
      branch.longitude = dto.longitude ? Number(dto.longitude) : null;
    if (dto.status !== undefined) branch.status = dto.status;
    return this.branchRepository.save(branch);
  }
}
