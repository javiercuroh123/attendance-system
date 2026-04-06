import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ example: 'HOR-001' })
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: '08:00:00' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  startTime!: string;

  @ApiProperty({ example: '17:00:00' })
  @Matches(/^\d{2}:\d{2}(:\d{2})?$/)
  endTime!: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(0)
  toleranceMinutes!: number;

  @ApiProperty({ example: 'MON,TUE,WED,THU,FRI' })
  @IsString()
  workDays!: string;

  @ApiPropertyOptional({ default: 'ACTIVE' })
  @IsOptional()
  @IsString()
  status?: string;
}
