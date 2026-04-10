import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryRecord } from '../database/storage.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private toRecord(row: {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  }): CategoryRecord {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt.getTime(),
      updatedAt: row.updatedAt.getTime(),
    };
  }

  async findAll(): Promise<CategoryRecord[]> {
    const rows = await this.prisma.category.findMany();
    return rows.map((r) => this.toRecord(r));
  }

  async findOne(id: string): Promise<CategoryRecord> {
    const row = await this.prisma.category.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Category not found');
    }
    return this.toRecord(row);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryRecord> {
    const row = await this.prisma.category.create({
      data: { name: dto.name, description: dto.description },
    });
    return this.toRecord(row);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryRecord> {
    try {
      const row = await this.prisma.category.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
        },
      });
      return this.toRecord(row);
    } catch {
      throw new NotFoundException('Category not found');
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch {
      throw new NotFoundException('Category not found');
    }
  }
}
