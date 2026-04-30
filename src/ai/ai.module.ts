import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { AiArticlesService } from './ai-articles.service';
import { AiController } from './ai.controller';
import { AiUsageService } from './ai-usage.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { GeminiService } from './gemini.service';

@Module({
  imports: [ArticleModule],
  controllers: [AiController],
  providers: [
    GeminiService,
    AiArticlesService,
    AiUsageService,
    AiRateLimitGuard,
  ],
  exports: [GeminiService, AiArticlesService, AiUsageService],
})
export class AiModule {}
