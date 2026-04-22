import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateQrDto {
  @ApiPropertyOptional({ description: 'Duracion en segundos', default: 300 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(300)
  validitySeconds?: number;

  @ApiPropertyOptional({
    description: 'Descripcion opcional del punto de marcacion',
  })
  @IsOptional()
  @IsString()
  qrPointDescription?: string;
}
