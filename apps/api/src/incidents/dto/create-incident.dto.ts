import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateIncidentDto {
  @ApiProperty({ example: '2026-04-02' })
  @IsString()
  attendanceDate!: string;

  @ApiProperty({ example: 'MISSING_CHECK_IN' })
  @IsString()
  requestType!: string;

  @ApiProperty()
  @IsString()
  description!: string;
}
