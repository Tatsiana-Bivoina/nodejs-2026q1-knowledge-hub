import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User as PrismaUser } from '@prisma/client';
import { UserRole } from '../common/enums/user-role.enum';
import { PrismaService } from '../prisma/prisma.service';
import { toApiUserRole, toPrismaUserRole } from '../database/prisma-enums';
import { UserRecord } from '../database/storage.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';

export type PublicUser = Omit<UserRecord, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private bcryptRounds(): number {
    return parseInt(process.env.CRYPT_SALT || '10', 10) || 10;
  }

  private toRecord(row: PrismaUser): UserRecord {
    return {
      id: row.id,
      login: row.login,
      passwordHash: row.password,
      role: toApiUserRole(row.role),
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    };
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

  async findAll(): Promise<PublicUser[]> {
    const rows = await this.prisma.user.findMany();
    return rows.map((r) => this.toPublic(this.toRecord(r)));
  }

  async findById(id: string): Promise<PublicUser> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException();
    }
    return this.toPublic(this.toRecord(row));
  }

  async findRecordById(id: string): Promise<UserRecord> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException();
    }
    return this.toRecord(row);
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const exists = await this.prisma.user.findUnique({
      where: { login: dto.login },
    });
    if (exists) {
      throw new ConflictException();
    }
    const role = dto.role ?? UserRole.VIEWER;
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptRounds());
    const row = await this.prisma.user.create({
      data: {
        login: dto.login,
        password: passwordHash,
        role: toPrismaUserRole(role),
      },
    });
    return this.toPublic(this.toRecord(row));
  }

  async validatePassword(user: UserRecord, plain: string): Promise<boolean> {
    return bcrypt.compare(plain, user.passwordHash);
  }

  async updatePassword(
    id: string,
    dto: UpdatePasswordDto,
  ): Promise<PublicUser> {
    const user = await this.findRecordById(id);
    const ok = await this.validatePassword(user, dto.oldPassword);
    if (!ok) {
      throw new ForbiddenException();
    }
    const password = await bcrypt.hash(dto.newPassword, this.bcryptRounds());
    const row = await this.prisma.user.update({
      where: { id },
      data: { password },
    });
    return this.toPublic(this.toRecord(row));
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch {
      throw new NotFoundException();
    }
  }
}
