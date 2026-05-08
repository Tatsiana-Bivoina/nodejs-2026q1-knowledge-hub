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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReindexRagDto } from './dto/reindex-rag.dto';
import { RagChatDto } from './dto/rag-chat.dto';
import { RagSearchDto } from './dto/rag-search.dto';
import { RagService } from './rag.service';

@ApiTags('ai-rag')
@ApiBearerAuth('access-token')
@Controller('ai/rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('index')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Build or refresh RAG vector index' })
  reindex(@Body() dto: ReindexRagDto) {
    return this.ragService.reindex(dto);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run semantic search over Knowledge Hub articles' })
  search(@Body() dto: RagSearchDto) {
    return this.ragService.search(dto);
  }

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Chat with Knowledge Hub using RAG context' })
  chat(@Body() dto: RagChatDto) {
    return this.ragService.chat(dto);
  }

  @Delete('index/articles/:articleId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove article vectors from index' })
  async removeArticleFromIndex(
    @Param('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
  ) {
    await this.ragService.removeArticleFromIndexOrThrow(articleId);
  }

  @Get('chat/:conversationId/history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get RAG chat conversation history' })
  history(
    @Param('conversationId', new ParseUUIDPipe({ version: '4' }))
    conversationId: string,
  ) {
    return this.ragService.getConversationHistory(conversationId);
  }
}
