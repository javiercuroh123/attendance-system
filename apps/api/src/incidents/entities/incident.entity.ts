import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Employee } from '../../employees/entities/employee.entity';
import { User } from '../../users/entities/user.entity';

@Entity('incident_requests')
export class IncidentRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Employee)
  @JoinColumn({ name: 'employee_id' })
  employee: Employee;

  @Column({ type: 'date' })
  attendance_date: string;

  @Column({ type: 'varchar' })
  request_type: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'varchar', default: 'PENDING' })
  status: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewed_at?: Date | null;

  @Column({ type: 'text', nullable: true })
  resolution_note?: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
