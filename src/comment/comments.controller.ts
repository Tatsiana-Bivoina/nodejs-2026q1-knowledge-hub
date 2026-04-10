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
import { applyPagination } from '../common/pagination/paginated-result';
import { applySorting } from '../common/pagination/apply-sorting';
import { CommentRecord } from '../database/storage.service';
import { nestHttpExceptionSchema } from '../common/swagger/nest-exception.schema';
import { CommentsService } from './comments.service';
import { CommentArticleQueryDto } from './dto/comment-article.query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

const COMMENT_SORT_KEYS: readonly (keyof CommentRecord)[] = [
  'id',
  'content',
  'articleId',
  'authorId',
  'createdAt',
];

@ApiTags('comment')
@Controller('comment')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiOperation({
    summary:
      'List comments for an article (articleId required; optional sortBy, order; page, limit)',
  })
  @ApiOkResponse({
    description:
      'Array of comments, or { total, page, limit, data } with ?page=&limit=',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Missing or invalid articleId query',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(400, 'Bad Request'),
      },
    },
  })
  async findByArticle(@Query() query: CommentArticleQueryDto) {
    const { page, limit, sortBy, order, articleId } = query;
    const list = applySorting(
      await this.commentsService.findByArticle(articleId),
      sortBy,
      order,
      COMMENT_SORT_KEYS,
    );
    return applyPagination(list, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by id' })
  @ApiOkResponse({ description: 'Comment record' })
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
    description: 'Comment does not exist',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(404, 'Not Found', 'Comment not found'),
      },
    },
  })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.commentsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create comment' })
  @ApiCreatedResponse({ description: 'Created comment' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Missing/invalid content, articleId, or authorId',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(400, 'Bad Request'),
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    description: 'articleId does not reference an existing article',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(
          422,
          'Unprocessable Entity',
          'Article not found',
        ),
      },
    },
  })
  create(@Body() dto: CreateCommentDto) {
    return this.commentsService.create(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete comment' })
  @ApiNoContentResponse({ description: 'Comment deleted' })
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
    description: 'Comment does not exist',
    content: {
      'application/json': {
        schema: nestHttpExceptionSchema(404, 'Not Found', 'Comment not found'),
      },
    },
  })
  async remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    await this.commentsService.remove(id);
  }
}
