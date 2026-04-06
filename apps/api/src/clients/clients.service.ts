import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
  ) {}

  async create(dto: CreateClientDto) {
    const existing = await this.clientRepository.findOne({
      where: { ruc: dto.ruc },
    });
    if (existing) {
      throw new ConflictException('Ya existe un cliente con ese RUC');
    }
    const client = this.clientRepository.create({
      ...dto,
      status: dto.status ?? 'ACTIVE',
    });
    return this.clientRepository.save(client);
  }

  findAll() {
    return this.clientRepository.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const client = await this.clientRepository.findOne({ where: { id } });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto) {
    const client = await this.findOne(id);
    Object.assign(client, dto);
    return this.clientRepository.save(client);
  }
}
