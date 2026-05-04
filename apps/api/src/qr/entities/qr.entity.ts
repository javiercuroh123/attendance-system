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

@Entity('qr_sessions')
export class QrSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'issued_by' })
  issued_by_user!: User;

  @RelationId((qr: QrSession) => qr.issued_by_user)
  issued_by!: string;

  @Column({ type: 'varchar' })
  token_hash!: string;

  @Column({ type: 'timestamp' })
  starts_at!: Date;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ type: 'varchar', nullable: true })
  point_description?: string | null;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;
}
