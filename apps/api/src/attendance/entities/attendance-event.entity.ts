import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttendanceEventType } from '../../common/enums/attendance-event-type.enum';
import { QrSession } from '../../qr/entities/qr.entity';
import { AttendanceRecord } from './attendance.entity';

@Entity('attendance_events')
export class AttendanceEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AttendanceRecord)
  @JoinColumn({ name: 'attendance_record_id' })
  attendance_record!: AttendanceRecord;

  @Column({ type: 'varchar' })
  event_type!: AttendanceEventType | string;

  @Column({ type: 'timestamp' })
  event_at!: Date;

  @ManyToOne(() => QrSession, { nullable: true })
  @JoinColumn({ name: 'qr_session_id' })
  qr_session?: QrSession | null;

  @Column({ type: 'jsonb', nullable: true })
  payload_json?: Record<string, unknown> | null;
}
