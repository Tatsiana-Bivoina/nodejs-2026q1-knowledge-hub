import { Module } from '@nestjs/common';
import { ArticleModule } from '../article/article.module';
import { AiArticlesService } from './ai-articles.service';
import { AiController } from './ai.controller';
import { GeminiService } from './gemini.service';

@Module({
  imports: [ArticleModule],
  controllers: [AiController],
  providers: [GeminiService, AiArticlesService],
  exports: [GeminiService, AiArticlesService],
})
export class AiModule {}
