import { Injectable } from '@nestjs/common';
import axios from 'axios';

type DiagnosticSnapshot = {
  at: string;
  category:
    | 'gemini_network'
    | 'gemini_http'
    | 'gemini_empty'
    | 'gemini_unknown';
  httpStatus?: number;
};

type UsageSnapshot = {
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  geminiLatency: {
    averageMs: number;
    totalMs: number;
    sampleCount: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRatio: number;
  };
  lastError?: DiagnosticSnapshot;
};

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private readonly requestsByEndpoint = new Map<string, number>();
  private tokenUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };
  private latencyTotalMs = 0;
  private latencySampleCount = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private lastError: DiagnosticSnapshot | undefined;

  trackRequest(endpoint: string): void {
    this.totalRequests += 1;
    this.requestsByEndpoint.set(
      endpoint,
      (this.requestsByEndpoint.get(endpoint) || 0) + 1,
    );
  }

  trackTokenUsage(input: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  }): void {
    this.tokenUsage.promptTokens += input.promptTokens || 0;
    this.tokenUsage.completionTokens += input.completionTokens || 0;
    this.tokenUsage.totalTokens += input.totalTokens || 0;
  }

  recordGeminiLatencyMs(ms: number): void {
    if (!Number.isFinite(ms) || ms < 0) {
      return;
    }
    this.latencyTotalMs += ms;
    this.latencySampleCount += 1;
  }

  recordCacheHit(): void {
    this.cacheHits += 1;
  }

  recordCacheMiss(): void {
    this.cacheMisses += 1;
  }

  recordDiagnostic(error: unknown): void {
    if (error === undefined || error === null) {
      return;
    }
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      this.lastError = {
        at: new Date().toISOString(),
        category: error.response ? 'gemini_http' : 'gemini_network',
        ...(status !== undefined ? { httpStatus: status } : {}),
      };
      return;
    }
    this.lastError = {
      at: new Date().toISOString(),
      category: 'gemini_unknown',
    };
  }

  getSnapshot(): UsageSnapshot {
    const totalCache = this.cacheHits + this.cacheMisses;
    const hitRatio = totalCache > 0 ? this.cacheHits / totalCache : 0;

    return {
      totalRequests: this.totalRequests,
      requestsByEndpoint: Object.fromEntries(this.requestsByEndpoint.entries()),
      tokenUsage: { ...this.tokenUsage },
      geminiLatency: {
        averageMs:
          this.latencySampleCount > 0
            ? this.latencyTotalMs / this.latencySampleCount
            : 0,
        totalMs: this.latencyTotalMs,
        sampleCount: this.latencySampleCount,
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRatio: Math.round(hitRatio * 10_000) / 10_000,
      },
      ...(this.lastError ? { lastError: this.lastError } : {}),
    };
  }
}
