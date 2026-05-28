import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleCode } from '../../common/enums/role-code.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@pedsar.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ enum: RoleCode, default: RoleCode.EMPLOYEE })
  @IsOptional()
  @IsEnum(RoleCode)
  role?: RoleCode;

  @ApiPropertyOptional({ default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
