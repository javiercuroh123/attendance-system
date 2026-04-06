import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('qr_sessions')
export class QrSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Branch)
  @JoinColumn({ name: 'branch_id' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  issued_by!: string;

  @Column({ type: 'varchar' })
  token_hash!: string;

  @Column({ type: 'timestamp' })
  starts_at!: Date;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}
