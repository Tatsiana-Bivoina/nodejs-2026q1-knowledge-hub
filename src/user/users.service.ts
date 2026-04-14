import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { StorageService, UserRecord } from '../database/storage.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UserRole } from '../common/enums/user-role.enum';

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly storage: StorageService) {}

  private bcryptRounds(): number {
    return parseInt(process.env.CRYPT_SALT || '10', 10) || 10;
  }

  toPublic(user: UserRecord): PublicUser {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  findAll(): PublicUser[] {
    return [...this.storage.users.values()].map((u) => this.toPublic(u));
  }

  findById(id: string): PublicUser {
    const user = this.storage.users.get(id);
    if (!user) {
      throw new NotFoundException();
    }
    return this.toPublic(user);
  }

  findRecordById(id: string): UserRecord {
    const user = this.storage.users.get(id);
    if (!user) {
      throw new NotFoundException();
    }
    return user;
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    if (this.storage.findUserByLogin(dto.login)) {
      throw new ConflictException();
    }
    const now = Date.now();
    const role = dto.role ?? UserRole.VIEWER;
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const user: UserRecord = {
      id: randomUUID(),
      login: dto.login,
      passwordHash,
      role,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.users.set(user.id, user);
    return this.toPublic(user);
  }

  async validatePassword(user: UserRecord, plain: string): Promise<boolean> {
    return bcrypt.compare(plain, user.passwordHash);
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
  ): Promise<PublicUser> {
    const user = this.findRecordById(id);
    const ok = await this.validatePassword(user, dto.oldPassword);
    if (!ok) {
      throw new ForbiddenException();
    }
    user.passwordHash = await bcrypt.hash(dto.newPassword, this.bcryptRounds());
    user.updatedAt = Date.now();
    return this.toPublic(user);
  }

  remove(id: string): void {
    if (!this.storage.users.has(id)) {
      throw new NotFoundException();
    }
    this.storage.nullifyArticleAuthor(id);
    this.storage.deleteCommentsByAuthor(id);
    this.storage.users.delete(id);
  }
}
