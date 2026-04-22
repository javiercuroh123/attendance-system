import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  recipient_user_id?: string | null;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', default: 'INTERNAL' })
  type!: string;

  @Column({ type: 'varchar', default: 'UNREAD' })
  status!: string;

  @Column({ type: 'timestamp', nullable: true })
  read_at?: Date | null;

  @CreateDateColumn()
  created_at!: Date;
}
