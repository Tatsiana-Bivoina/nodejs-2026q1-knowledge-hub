import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiArticlesService } from './ai-articles.service';
import { AiUsageService } from './ai-usage.service';
import { AnalyzeArticleDto } from './dto/analyze-article.dto';
import { AiArticleIdParamDto } from './dto/ai-article-id-param.dto';
import { SummarizeArticleDto } from './dto/summarize-article.dto';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { GenerateAiDto } from './dto/generate-ai.dto';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { AiGenerateService } from './ai-generate.service';
import { GeminiService } from './gemini.service';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@UseGuards(AiRateLimitGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly aiArticlesService: AiArticlesService,
    private readonly aiUsageService: AiUsageService,
    private readonly aiGenerateService: AiGenerateService,
  ) {}

  @Get('test')
  @ApiOperation({ summary: 'Test Gemini API integration' })
  async test() {
    this.aiUsageService.trackRequest('/ai/test');
    const text = await this.geminiService.generate('Say hello from Gemini');
    return { text };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get in-memory AI usage stats' })
  usage() {
    this.aiUsageService.trackRequest('/ai/usage');
    return this.aiUsageService.getSnapshot();
  }

  @Post('generate')
  @ApiOperation({
    summary:
      'Optional free-form Gemini generation with optional session-based context',
  })
  async generateFreeForm(@Body() dto: GenerateAiDto) {
    this.aiUsageService.trackRequest('/ai/generate');
    return this.aiGenerateService.run(dto);
  }

  @Post('articles/:articleId/summarize')
  @ApiOperation({ summary: 'Generate summary for existing article' })
  summarize(
    @Param() params: AiArticleIdParamDto,
    @Body() dto: SummarizeArticleDto,
  ) {
    this.aiUsageService.trackRequest('/ai/articles/:articleId/summarize');
    return this.aiArticlesService.summarize(params.articleId, dto);
  }

  @Post('articles/:articleId/translate')
  @ApiOperation({ summary: 'Translate content of existing article' })
  translate(
    @Param() params: AiArticleIdParamDto,
    @Body() dto: TranslateArticleDto,
  ) {
    this.aiUsageService.trackRequest('/ai/articles/:articleId/translate');
    return this.aiArticlesService.translate(params.articleId, dto);
  }

  @Post('articles/:articleId/analyze')
  @ApiOperation({ summary: 'Analyze content of existing article' })
  analyze(
    @Param() params: AiArticleIdParamDto,
    @Body() dto: AnalyzeArticleDto,
  ) {
    this.aiUsageService.trackRequest('/ai/articles/:articleId/analyze');
    return this.aiArticlesService.analyze(params.articleId, dto);
  }
}
