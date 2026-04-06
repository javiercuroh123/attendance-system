import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ValidateQrDto {
  @ApiProperty()
  @IsString()
  qrToken!: string;
}
