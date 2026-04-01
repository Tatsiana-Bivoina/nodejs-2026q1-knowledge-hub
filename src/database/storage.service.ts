import { Injectable } from '@nestjs/common';
import { UserRole } from '../common/enums/user-role.enum';

export type UserRecord = {
  id: string;
  login: string;
  passwordHash: string;
  role: UserRole;
  createdAt: number;
  updatedAt: number;
};

@Injectable()
export class StorageService {
  readonly users = new Map<string, UserRecord>();

  findUserByLogin(login: string): UserRecord | undefined {
    return [...this.users.values()].find((u) => u.login === login);
  }
}
