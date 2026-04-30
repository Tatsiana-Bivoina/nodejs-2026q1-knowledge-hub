import { Injectable } from '@nestjs/common';

type UsageSnapshot = {
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
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

  getSnapshot(): UsageSnapshot {
    return {
      totalRequests: this.totalRequests,
      requestsByEndpoint: Object.fromEntries(this.requestsByEndpoint.entries()),
      tokenUsage: { ...this.tokenUsage },
    };
  }
}
