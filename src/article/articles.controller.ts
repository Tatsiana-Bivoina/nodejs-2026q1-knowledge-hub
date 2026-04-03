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
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleFilterQueryDto } from './dto/article-filter.query.dto';

@ApiTags('article')
@Controller('article')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({
    summary: 'List articles (optional filters: status, categoryId, tag)',
  })
  findAll(@Query() query: ArticleFilterQueryDto) {
    return this.articlesService.findAll(query);
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
