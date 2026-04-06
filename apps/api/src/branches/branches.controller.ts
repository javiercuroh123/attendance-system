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
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Post()
  @Roles(RoleCode.ADMIN, RoleCode.RRHH)
  @ApiOperation({ summary: 'Crear sede' })
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Get()
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Listar sedes' })
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(':id')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH, RoleCode.SUPERVISOR)
  @ApiOperation({ summary: 'Obtener sede por id' })
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleCode.ADMIN, RoleCode.RRHH)
  @ApiOperation({ summary: 'Actualizar sede' })
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }
}
