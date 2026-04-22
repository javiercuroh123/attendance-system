import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  worksiteName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  worksiteAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  worksiteLatitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  worksiteLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qrPointDescription?: string;

  @ApiPropertyOptional({ default: 'America/Lima' })
  @IsOptional()
  @IsString()
  defaultTimezone?: string;

  @ApiPropertyOptional({ default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
