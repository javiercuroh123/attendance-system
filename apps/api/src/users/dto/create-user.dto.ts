import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleCode } from '../../common/enums/role-code.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'usuario@consultora.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '12345678' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({
    enum: RoleCode,
    isArray: true,
    default: [RoleCode.EMPLOYEE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RoleCode, { each: true })
  roleCodes?: RoleCode[];

  @ApiPropertyOptional({ default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
