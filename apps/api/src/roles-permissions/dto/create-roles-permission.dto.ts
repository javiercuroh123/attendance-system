import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleCode } from '../../common/enums/role-code.enum';

export class CreateRolesPermissionDto {
  @ApiProperty({ enum: RoleCode })
  @IsEnum(RoleCode)
  code!: RoleCode;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
