import { Request } from 'express';
import { UserRole } from '../../common/enums/user-role.enum';

export type AuthUser = {
  userId: string;
  sub: string;
  login: string;
  role: UserRole;
};

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};
