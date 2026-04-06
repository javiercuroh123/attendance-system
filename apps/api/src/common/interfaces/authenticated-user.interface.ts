import { RoleCode } from '../enums/role-code.enum';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  status: string;
  roles: RoleCode[];
}
