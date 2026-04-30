import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiArticlesService } from './ai-articles.service';
import { AnalyzeArticleDto } from './dto/analyze-article.dto';
import { AiArticleIdParamDto } from './dto/ai-article-id-param.dto';
import { SummarizeArticleDto } from './dto/summarize-article.dto';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { GeminiService } from './gemini.service';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@Controller('ai')
export class AiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly aiArticlesService: AiArticlesService,
  ) {}

  @Get('test')
  @ApiOperation({ summary: 'Test Gemini API integration' })
  async test() {
    const text = await this.geminiService.generate('Say hello from Gemini');
    return { text };
  }

  @Post('articles/:articleId/summarize')
  @ApiOperation({ summary: 'Generate summary for existing article' })
  summarize(
    @Param() params: AiArticleIdParamDto,
    @Body() dto: SummarizeArticleDto,
  ) {
    return this.aiArticlesService.summarize(params.articleId, dto);
  }

  @Post('articles/:articleId/translate')
  @ApiOperation({ summary: 'Translate content of existing article' })
  translate(
    @Param() params: AiArticleIdParamDto,
    @Body() dto: TranslateArticleDto,
  ) {
    return this.aiArticlesService.translate(params.articleId, dto);
  }

  @Post('articles/:articleId/analyze')
  @ApiOperation({ summary: 'Analyze content of existing article' })
  analyze(
    @Param() params: AiArticleIdParamDto,
    @Body() dto: AnalyzeArticleDto,
  ) {
    return this.aiArticlesService.analyze(params.articleId, dto);
  }
}
