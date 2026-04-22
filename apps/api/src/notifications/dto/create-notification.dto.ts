import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiProperty({ example: 'Incidencia pendiente' })
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Tienes una regularizacion por revisar.' })
  @IsString()
  message!: string;

  @ApiPropertyOptional({ default: 'INTERNAL' })
  @IsOptional()
  @IsString()
  type?: string;
}
