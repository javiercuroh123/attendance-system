import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateAttendanceDto {
  @ApiProperty()
  @IsString()
  qrToken!: string;

  @ApiPropertyOptional({ example: '2026-03-13T08:01:12' })
  @IsOptional()
  @IsISO8601()
  deviceTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, unknown>;
}
