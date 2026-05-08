import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { AiArticlesService } from './ai-articles.service';
import { AiController } from './ai.controller';
import { AiConversationService } from './ai-conversation.service';
import { AiGenerateService } from './ai-generate.service';
import { AiUsageService } from './ai-usage.service';
import { AiRateLimitGuard } from './guards/ai-rate-limit.guard';
import { GeminiService } from './gemini.service';
import { RagModule } from './rag/rag.module';

@Module({
  imports: [ArticleModule, RagModule],
  controllers: [AiController],
  providers: [
    AiUsageService,
    AiConversationService,
    GeminiService,
    AiGenerateService,
    AiArticlesService,
    AiRateLimitGuard,
  ],
  exports: [GeminiService, AiArticlesService, AiUsageService],
})
export class AiModule {}
