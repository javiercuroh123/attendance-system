import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { RoleCode } from '../../common/enums/role-code.enum';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  code!: RoleCode;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;
}
