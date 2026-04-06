import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAuditDto {
  @ApiProperty()
  @IsUUID()
  actorUserId!: string;

  @ApiProperty()
  @IsString()
  module!: string;

  @ApiProperty()
  @IsString()
  action!: string;

  @ApiProperty()
  @IsString()
  entityName!: string;

  @ApiProperty()
  @IsString()
  entityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  oldData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  newData?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
