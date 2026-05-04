import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'actor_user_id' })
  actor_user!: User;

  @RelationId((audit: AuditLog) => audit.actor_user)
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
