import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateAreaDto {
  @ApiProperty({ example: 'ADM' })
  @IsString()
  code!: string;

  @ApiProperty({ example: 'Administracion' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
