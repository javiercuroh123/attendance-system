import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Branch } from '../branches/entities/branch.entity';
import { QrSession } from './entities/qr.entity';
import { QrController } from './qr.controller';
import { QrService } from './qr.service';

@Module({
  imports: [TypeOrmModule.forFeature([QrSession, Branch]), AuditModule],
  controllers: [QrController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
