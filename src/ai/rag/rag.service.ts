import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NotFoundError } from '../../common/errors/http-errors';
import { ReindexRagDto } from './dto/reindex-rag.dto';
import { RagChatDto } from './dto/rag-chat.dto';
import { RagSearchDto } from './dto/rag-search.dto';

@Injectable()
export class RagService {
  async reindex(dto: ReindexRagDto) {
    const selectedArticles = dto.articleIds?.length ?? 0;

    return {
      indexedArticles: selectedArticles,
      indexedChunks: 0,
      vectorCollection:
        process.env.RAG_VECTOR_COLLECTION ?? 'knowledge_hub_articles',
      filters: {
        onlyPublished: dto.onlyPublished ?? true,
      },
    };
  }

  async search(dto: RagSearchDto) {
    return {
      results: [],
      meta: {
        query: dto.query,
        limit: dto.limit ?? 5,
        filters: {
          articleStatus: dto.articleStatus ?? null,
          categoryId: dto.categoryId ?? null,
          tags: dto.tags ?? [],
        },
      },
    };
  }

  async chat(dto: RagChatDto) {
    const conversationId = dto.conversationId ?? randomUUID();

    return {
      answer:
        'RAG chat scaffold is ready. Real retrieval and generation will be implemented in next blocks.',
      sources: [],
      conversationId,
    };
  }

  async removeArticleFromIndex(articleId: string): Promise<boolean> {
    void articleId;
    return false;
  }

  async removeArticleFromIndexOrThrow(articleId: string): Promise<void> {
    const removed = await this.removeArticleFromIndex(articleId);
    if (!removed) {
      throw new NotFoundError('Article index entries not found');
    }
  }
}
