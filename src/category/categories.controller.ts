import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { applyPagination } from '../common/pagination/paginated-result';
import { applySorting } from '../common/pagination/apply-sorting';
import { CategoryRecord } from '../database/storage.service';
import { nestHttpExceptionSchema } from '../common/swagger/nest-exception.schema';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const CATEGORY_SORT_KEYS: readonly (keyof CategoryRecord)[] = [
  'id',
  'name',
  'description',
  'createdAt',
  'updatedAt',
];

@ApiTags('category')
@Controller('category')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List all categories (optional sortBy, order; pagination: page, limit)',
  })
  @ApiOkResponse({
    description:
      'Array of categories, or { total, page, limit, data } with ?page=&limit=',
  })
  async findAll(@Query() query: PaginationQueryDto) {
    const { page, limit, sortBy, order } = query;
    const list = applySorting(
      await this.categoriesService.findAll(),
      sortBy,
      order,
      CATEGORY_SORT_KEYS,
    );
    return applyPagination(list, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  @ApiOkResponse({ description: 'Category record' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID (not v4)',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(
          400,
          'Bad Request',
          'Validation failed (uuid)',
        ),
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category does not exist',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(404, 'Not Found', 'Category not found'),
      },
    },
  })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create category' })
  @ApiCreatedResponse({ description: 'Created category' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Missing or invalid name / description',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(400, 'Bad Request'),
      },
    },
  })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiOkResponse({ description: 'Updated category' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID or invalid body',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(400, 'Bad Request'),
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category does not exist',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(404, 'Not Found', 'Category not found'),
      },
    },
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete category' })
  @ApiNoContentResponse({
    description: 'Deleted; articles referencing it get categoryId null',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid UUID (not v4)',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(
          400,
          'Bad Request',
          'Validation failed (uuid)',
        ),
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category does not exist',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(404, 'Not Found', 'Category not found'),
      },
    },
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.categoriesService.remove(id);
  }
}
