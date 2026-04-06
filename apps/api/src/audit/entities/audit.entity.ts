import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  actor_user_id!: string;

  @Column({ type: 'varchar' })
  module!: string;

  @Column({ type: 'varchar' })
  action!: string;

  @Column({ type: 'varchar' })
  entity_name!: string;

  @Column({ type: 'varchar' })
  entity_id!: string;

  @Column({ type: 'jsonb', nullable: true })
  old_data?: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  new_data?: Record<string, unknown> | null;

  @Column({ type: 'varchar', default: 'SUCCESS' })
  status!: string;

  @Column({ type: 'varchar', nullable: true })
  ip_address?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  device_info?: Record<string, unknown> | null;

  @CreateDateColumn()
  created_at!: Date;
}
