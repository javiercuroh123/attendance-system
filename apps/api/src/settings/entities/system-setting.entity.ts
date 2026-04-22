import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', default: 'Attendance System SAC' })
  company_name!: string;

  @Column({ type: 'varchar', default: 'Centro Principal' })
  worksite_name!: string;

  @Column({ type: 'varchar', nullable: true })
  worksite_address?: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  worksite_latitude?: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  worksite_longitude?: number | null;

  @Column({ type: 'varchar', nullable: true })
  qr_point_description?: string | null;

  @Column({ type: 'varchar', default: 'America/Lima' })
  default_timezone!: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
