import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class CreateClientDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: '20123456789' })
  @IsString()
  @Length(11, 11)
  ruc!: string;

  @ApiPropertyOptional({ default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
