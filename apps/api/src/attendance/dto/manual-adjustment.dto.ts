import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class ManualAdjustmentDto {
  @ApiPropertyOptional({ example: '2026-03-13T08:02:00' })
  @IsOptional()
  @IsISO8601()
  checkInAt?: string;

  @ApiPropertyOptional({ example: '2026-03-13T17:05:00' })
  @IsOptional()
  @IsISO8601()
  checkOutAt?: string;

  @ApiProperty()
  @IsString()
  reason!: string;
}
