import { Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { ArticleStatus as PrismaArticleStatus } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import {
  NotFoundError,
  ServiceUnavailableError,
} from '../../common/errors/http-errors';
import { AppLogger } from '../../common/logging/app-logger';
import { toApiArticleStatus } from '../../database/prisma-enums';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../gemini.service';
import { ReindexRagDto } from './dto/reindex-rag.dto';
import { RagChatDto } from './dto/rag-chat.dto';
import { RagSearchDto } from './dto/rag-search.dto';

type QdrantPoint = {
  id: string;
  vector: number[];
  payload: Record<string, unknown>;
};

type QdrantScrollResponse = {
  result?: {
    points?: Array<{ id: string | number }>;
  };
};

type QdrantSearchResponse = {
  result?: Array<{
    score?: number;
    payload?: {
      articleId?: string;
      articleTitle?: string;
      articleStatus?: string;
      categoryId?: string | null;
      tags?: string[];
      chunk?: string;
    };
  }>;
};

type RetrievedChunk = {
  articleId: string;
  articleTitle: string;
  chunk: string;
  similarity: number;
};

type ConversationMessage = {
  role: 'user' | 'assistant';
  text: string;
};

@Injectable()
export class RagService {
  private readonly logger = this.appLogger.child('RagService');
  private readonly vectorDbUrl =
    process.env.RAG_VECTOR_DB_URL ?? 'http://vectordb:6333';
  private readonly vectorCollection =
    process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles';
  private readonly chunkSize = this.getChunkSize();
  private readonly chunkOverlap = this.getChunkOverlap();
  private readonly maxConversationMessages = this.getConversationMaxMessages();
  private readonly qdrant: AxiosInstance;
  private readonly conversations = new Map<string, ConversationMessage[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly appLogger: AppLogger,
  ) {
    this.qdrant = axios.create({
      baseURL: this.vectorDbUrl,
      timeout: 15000,
    });
  }

  async reindex(dto: ReindexRagDto) {
    const onlyPublished = dto.onlyPublished ?? true;

    const articles = await this.prisma.article.findMany({
      where: {
        ...(onlyPublished ? { status: PrismaArticleStatus.PUBLISHED } : {}),
        ...(dto.articleIds?.length ? { id: { in: dto.articleIds } } : {}),
      },
      include: { tags: true },
      orderBy: { id: 'asc' },
    });

    let indexedChunks = 0;
    let collectionReady = false;

    for (const article of articles) {
      await this.deleteVectorsForArticle(article.id);

      const chunks = this.chunkText(article.content);
      if (chunks.length === 0) {
        continue;
      }

      const vectors = await this.geminiService.embedTexts(
        chunks.map((chunk) => `Article title: ${article.title}\n\n${chunk}`),
      );

      if (!collectionReady) {
        await this.ensureCollection(vectors[0].length);
        collectionReady = true;
      }

      const points: QdrantPoint[] = chunks.map((chunk, idx) => ({
        id: this.makePointId(article.id, idx),
        vector: vectors[idx],
        payload: {
          articleId: article.id,
          articleTitle: article.title,
          articleStatus: toApiArticleStatus(article.status),
          categoryId: article.categoryId,
          tags: article.tags.map((tag) => tag.name),
          chunkIndex: idx,
          chunk,
        },
      }));

      await this.upsertPoints(points);
      indexedChunks += points.length;
    }

    return {
      indexedArticles: articles.length,
      indexedChunks,
      vectorCollection: this.vectorCollection,
    };
  }

  async search(dto: RagSearchDto) {
    const must: Array<Record<string, unknown>> = [];
    if (dto.articleStatus) {
      must.push({
        key: 'articleStatus',
        match: { value: dto.articleStatus },
      });
    }
    if (dto.categoryId) {
      must.push({
        key: 'categoryId',
        match: { value: dto.categoryId },
      });
    }
    if (dto.tags?.length) {
      must.push({
        key: 'tags',
        match: { any: dto.tags },
      });
    }

    const results = await this.semanticSearch({
      query: dto.query,
      limit: dto.limit ?? 5,
      must,
    });

    return { results };
  }

  async chat(dto: RagChatDto) {
    const conversationId = dto.conversationId ?? randomUUID();
    const history = this.conversations.get(conversationId) ?? [];
    const retrievedChunks = await this.semanticSearch({
      query: dto.question,
      limit: 5,
      must: [],
    });

    const prompt = this.buildGroundedChatPrompt(
      dto.question,
      history,
      retrievedChunks,
    );
    const answer = await this.geminiService.generate(prompt);

    this.appendConversationMessage(conversationId, {
      role: 'user',
      text: dto.question,
    });
    this.appendConversationMessage(conversationId, {
      role: 'assistant',
      text: answer,
    });

    return {
      answer,
      sources: retrievedChunks.map((chunk) => ({
        articleId: chunk.articleId,
        articleTitle: chunk.articleTitle,
        relevantChunk: chunk.chunk,
      })),
      conversationId,
    };
  }

  private async semanticSearch(params: {
    query: string;
    limit: number;
    must: Array<Record<string, unknown>>;
  }): Promise<RetrievedChunk[]> {
    const queryVector = await this.geminiService.embedText(params.query);

    try {
      const response = await this.qdrant.post<QdrantSearchResponse>(
        `/collections/${this.vectorCollection}/points/search`,
        {
          vector: queryVector,
          limit: params.limit,
          with_payload: true,
          with_vector: false,
          ...(params.must.length ? { filter: { must: params.must } } : {}),
        },
      );

      return (response.data.result ?? [])
        .filter(
          (item) =>
            item.payload?.articleId &&
            item.payload?.articleTitle &&
            item.payload?.chunk,
        )
        .map((item) => ({
          articleId: item.payload!.articleId!,
          articleTitle: item.payload!.articleTitle!,
          chunk: item.payload!.chunk!,
          similarity: item.score ?? 0,
        }));
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      throw this.toVectorDbError(error);
    }
  }

  async removeArticleFromIndex(articleId: string): Promise<boolean> {
    const exists = await this.hasVectorsForArticle(articleId);
    if (!exists) {
      return false;
    }

    await this.deleteVectorsForArticle(articleId);
    return true;
  }

  async removeArticleFromIndexOrThrow(articleId: string): Promise<void> {
    const removed = await this.removeArticleFromIndex(articleId);
    if (!removed) {
      throw new NotFoundError('Article index entries not found');
    }
  }

  getConversationHistory(conversationId: string) {
    const messages = this.conversations.get(conversationId) ?? [];
    return {
      conversationId,
      messages,
    };
  }

  private getChunkSize(): number {
    const raw = Number.parseInt(process.env.RAG_CHUNK_SIZE ?? '800', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 800;
  }

  private getChunkOverlap(): number {
    const raw = Number.parseInt(process.env.RAG_CHUNK_OVERLAP ?? '200', 10);
    if (!Number.isFinite(raw) || raw < 0) {
      return 200;
    }
    return raw;
  }

  private getConversationMaxMessages(): number {
    const raw = Number.parseInt(
      process.env.RAG_CONVERSATION_MAX_MESSAGES ?? '20',
      10,
    );
    return Number.isFinite(raw) && raw > 0 ? raw : 20;
  }

  private chunkText(content: string): string[] {
    const text = content.trim();
    if (!text) {
      return [];
    }

    const overlap = Math.min(this.chunkOverlap, Math.max(this.chunkSize - 1, 0));
    const step = Math.max(this.chunkSize - overlap, 1);
    const chunks: string[] = [];

    for (let start = 0; start < text.length; start += step) {
      const chunk = text.slice(start, start + this.chunkSize).trim();
      if (!chunk) {
        continue;
      }
      chunks.push(chunk);
      if (start + this.chunkSize >= text.length) {
        break;
      }
    }

    return chunks;
  }

  private appendConversationMessage(
    conversationId: string,
    message: ConversationMessage,
  ): void {
    const messages = this.conversations.get(conversationId) ?? [];
    messages.push(message);
    if (messages.length > this.maxConversationMessages) {
      messages.splice(0, messages.length - this.maxConversationMessages);
    }
    this.conversations.set(conversationId, messages);
  }

  private buildGroundedChatPrompt(
    question: string,
    history: ConversationMessage[],
    chunks: RetrievedChunk[],
  ): string {
    const historyText =
      history.length === 0
        ? 'No prior conversation.'
        : history
            .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
            .join('\n');

    const sourcesText =
      chunks.length === 0
        ? 'No relevant sources found in the indexed knowledge base.'
        : chunks
            .map(
              (chunk, idx) =>
                `[S${idx + 1}] ${chunk.articleTitle} (${chunk.articleId})\n${chunk.chunk}`,
            )
            .join('\n\n');

    return [
      'You are a Knowledge Hub assistant. Answer only using the provided sources.',
      'If sources are insufficient, explicitly say that information is not available in Knowledge Hub.',
      '',
      'Conversation history:',
      historyText,
      '',
      'Sources:',
      sourcesText,
      '',
      `User question: ${question}`,
      '',
      'Provide a concise answer in plain text.',
    ].join('\n');
  }

  private makePointId(articleId: string, chunkIndex: number): string {
    const hex = createHash('sha1')
      .update(`${articleId}:${chunkIndex}`)
      .digest('hex')
      .slice(0, 32)
      .split('');

    // Build a deterministic RFC 4122 compatible UUID (version 5 style bits).
    hex[12] = '5';
    const variant = Number.parseInt(hex[16], 16);
    hex[16] = ((variant & 0x3) | 0x8).toString(16);

    return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
  }

  private async ensureCollection(vectorSize: number): Promise<void> {
    try {
      await this.qdrant.get(`/collections/${this.vectorCollection}`);
      return;
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 404) {
        throw this.toVectorDbError(error);
      }
    }

    try {
      await this.qdrant.put(`/collections/${this.vectorCollection}`, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });
    } catch (error) {
      throw this.toVectorDbError(error);
    }
  }

  private async upsertPoints(points: QdrantPoint[]): Promise<void> {
    if (points.length === 0) {
      return;
    }

    try {
      await this.qdrant.put(`/collections/${this.vectorCollection}/points`, {
        points,
      });
    } catch (error) {
      throw this.toVectorDbError(error);
    }
  }

  private async hasVectorsForArticle(articleId: string): Promise<boolean> {
    try {
      const response = await this.qdrant.post<QdrantScrollResponse>(
        `/collections/${this.vectorCollection}/points/scroll`,
        {
          limit: 1,
          with_payload: false,
          with_vector: false,
          filter: {
            must: [
              {
                key: 'articleId',
                match: { value: articleId },
              },
            ],
          },
        },
      );

      return (response.data.result?.points?.length ?? 0) > 0;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      throw this.toVectorDbError(error);
    }
  }

  private async deleteVectorsForArticle(articleId: string): Promise<void> {
    try {
      await this.qdrant.post(`/collections/${this.vectorCollection}/points/delete`, {
        filter: {
          must: [
            {
              key: 'articleId',
              match: { value: articleId },
            },
          ],
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return;
      }
      throw this.toVectorDbError(error);
    }
  }

  private toVectorDbError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = this.extractUpstreamMessage(error);
      this.logger.error(
        `Vector DB request failed (status: ${status ?? 'n/a'}): ${message || 'no details'}`,
      );
      return new ServiceUnavailableError('Vector database is unavailable');
    }

    this.logger.error('Vector DB request failed with unknown error');
    return new ServiceUnavailableError('Vector database is unavailable');
  }

  private extractUpstreamMessage(error: AxiosError): string {
    const data = error.response?.data;
    if (
      typeof data === 'object' &&
      data !== null &&
      'status' in data &&
      typeof (data as { status?: unknown }).status === 'object'
    ) {
      const status = (data as { status?: { error?: unknown } }).status;
      if (typeof status?.error === 'string') {
        return status.error;
      }
    }

    if (
      typeof data === 'object' &&
      data !== null &&
      'result' in data &&
      typeof (data as { result?: unknown }).result === 'object'
    ) {
      return JSON.stringify((data as { result?: unknown }).result);
    }

    return '';
  }
}
