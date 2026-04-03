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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { applyPagination } from '../common/pagination/paginated-result';
import { applySorting } from '../common/pagination/apply-sorting';
import { ArticleRecord } from '../database/storage.service';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleFilterQueryDto } from './dto/article-filter.query.dto';

const ARTICLE_SORT_KEYS: readonly (keyof ArticleRecord)[] = [
  'id',
  'title',
  'content',
  'status',
  'authorId',
  'categoryId',
  'createdAt',
  'updatedAt',
];

@ApiTags('article')
@Controller('article')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({
    summary:
      'List articles (filters; optional sortBy, order; pagination: page, limit)',
  })
  findAll(@Query() query: ArticleFilterQueryDto) {
    const { page, limit, sortBy, order, ...filter } = query;
    const list = applySorting(
      this.articlesService.findAll(filter),
      sortBy,
      order,
      ARTICLE_SORT_KEYS,
    );
    return applyPagination(list, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get article by id' })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.articlesService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create article' })
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update article' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateArticleDto,
  ) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete article' })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    this.articlesService.remove(id);
  }
}
