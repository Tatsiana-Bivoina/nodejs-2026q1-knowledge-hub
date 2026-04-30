import { Injectable } from '@nestjs/common';
import { ArticlesService } from '../article/articles.service';
import { AnalyzeArticleDto, AnalyzeTask } from './dto/analyze-article.dto';
import {
  SummarizeArticleDto,
  SummaryLength,
} from './dto/summarize-article.dto';
import { TranslateArticleDto } from './dto/translate-article.dto';
import { buildAnalyzePrompt } from './prompts/analyze.prompt';
import { buildSummarizePrompt } from './prompts/summarize.prompt';
import { buildTranslatePrompt } from './prompts/translate.prompt';
import { GeminiService } from './gemini.service';

type AnalyzeSeverity = 'info' | 'warning' | 'error';

type AnalyzePayload = {
  analysis: string;
  suggestions: string[];
  severity: AnalyzeSeverity;
};

@Injectable()
export class AiArticlesService {
  constructor(
    private readonly articlesService: ArticlesService,
    private readonly geminiService: GeminiService,
  ) {}

  async summarize(articleId: string, dto: SummarizeArticleDto) {
    const article = await this.articlesService.findOne(articleId);
    const maxLength: SummaryLength = dto.maxLength || 'medium';
    const prompt = buildSummarizePrompt(
      article.title,
      article.content,
      maxLength,
    );
    const summary = await this.geminiService.generate(prompt);

    return {
      articleId,
      summary,
      originalLength: article.content.length,
      summaryLength: summary.length,
    };
  }

  async translate(articleId: string, dto: TranslateArticleDto) {
    const article = await this.articlesService.findOne(articleId);
    const prompt = buildTranslatePrompt(
      article.title,
      article.content,
      dto.targetLanguage,
      dto.sourceLanguage,
    );
    const raw = await this.geminiService.generate(prompt);
    const parsed = this.parseJson(raw);

    return {
      articleId,
      translatedText:
        typeof parsed.translatedText === 'string' ? parsed.translatedText : raw,
      detectedLanguage:
        typeof parsed.detectedLanguage === 'string'
          ? parsed.detectedLanguage
          : dto.sourceLanguage || 'unknown',
    };
  }

  async analyze(
    articleId: string,
    dto: AnalyzeArticleDto,
  ): Promise<{
    articleId: string;
    analysis: string;
    suggestions: string[];
    severity: AnalyzeSeverity;
  }> {
    const article = await this.articlesService.findOne(articleId);
    const task: AnalyzeTask = dto.task || 'review';
    const prompt = buildAnalyzePrompt(article.title, article.content, task);
    const raw = await this.geminiService.generate(prompt);
    const parsed = this.parseAnalyzePayload(raw);

    return {
      articleId,
      analysis: parsed.analysis,
      suggestions: parsed.suggestions,
      severity: parsed.severity,
    };
  }

  private parseAnalyzePayload(raw: string): AnalyzePayload {
    const parsed = this.parseJson(raw);
    const severity = this.parseSeverity(parsed.severity);
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter(
          (item): item is string => typeof item === 'string',
        )
      : [];

    return {
      analysis: typeof parsed.analysis === 'string' ? parsed.analysis : raw,
      suggestions,
      severity,
    };
  }

  private parseSeverity(value: unknown): AnalyzeSeverity {
    if (value === 'warning' || value === 'error') {
      return value;
    }
    return 'info';
  }

  private parseJson(raw: string): Record<string, unknown> {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      const matched = raw.match(/\{[\s\S]*\}/);
      if (!matched) {
        return {};
      }
      try {
        return JSON.parse(matched[0]) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
  }
}
