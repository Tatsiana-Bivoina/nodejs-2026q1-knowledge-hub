import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StorageService, CategoryRecord } from '../database/storage.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly storage: StorageService) {}

  findAll(): CategoryRecord[] {
    return [...this.storage.categories.values()];
  }

  findOne(id: string): CategoryRecord {
    const category = this.storage.categories.get(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  create(dto: CreateCategoryDto): CategoryRecord {
    const now = Date.now();
    const category: CategoryRecord = {
      id: randomUUID(),
      name: dto.name,
      description: dto.description,
      createdAt: now,
      updatedAt: now,
    };
    this.storage.categories.set(category.id, category);
    return category;
  }

  update(id: string, dto: UpdateCategoryDto): CategoryRecord {
    const category = this.findOne(id);
    if (dto.name !== undefined) {
      category.name = dto.name;
    }
    if (dto.description !== undefined) {
      category.description = dto.description;
    }
    category.updatedAt = Date.now();
    return category;
  }

  remove(id: string): void {
    if (!this.storage.categories.has(id)) {
      throw new NotFoundException('Category not found');
    }
    this.storage.nullifyArticleCategory(id);
    this.storage.categories.delete(id);
  }
}
