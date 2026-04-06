import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';
import { AttendanceStatus } from '../../common/enums/attendance-status.enum';
import { Employee } from '../../employees/entities/employee.entity';
import { QrSession } from '../../qr/entities/qr.entity';
import { AttendanceEvent } from './attendance-event.entity';

@Entity('attendance_records')
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee!: Employee;

  @Column({ type: 'date' })
  attendance_date!: string;

  @Column({ type: 'timestamp', nullable: true })
  check_in_at?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  check_out_at?: Date | null;

  @Column({ type: 'varchar', default: AttendanceStatus.ON_TIME })
  status!: AttendanceStatus | string;

  @Column({ type: 'int', default: 0 })
  late_minutes!: number;

  @Column({ type: 'varchar' })
  source!: string;

  @ManyToOne(() => QrSession, { nullable: true })
  @JoinColumn({ name: 'qr_session_id' })
  qr_session?: QrSession | null;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch | null;

  @Column({ type: 'jsonb', nullable: true })
  device_info?: Record<string, unknown> | null;

  @OneToMany(() => AttendanceEvent, (event) => event.attendance_record)
  events!: AttendanceEvent[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
