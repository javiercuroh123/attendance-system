import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleCode } from '../common/enums/role-code.enum';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('Clients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(RoleCode.ADMIN, RoleCode.RRHH)
  @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Listar clientes' })
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener cliente por id' })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH)
  @ApiOperation({ summary: 'Actualizar cliente' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }
}
