import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CreateQrDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiPropertyOptional({ description: 'Duración en segundos', default: 300 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(300)
  validitySeconds?: number;
}
