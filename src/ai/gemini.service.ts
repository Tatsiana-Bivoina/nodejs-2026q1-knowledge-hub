import { Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { AppLogger } from '../common/logging/app-logger';
import {
  InternalError,
  ServiceUnavailableError,
} from '../common/errors/http-errors';
import { AiUsageService } from './ai-usage.service';

type GeminiPart = {
  text?: string;
};

type GeminiCandidate = {
  content?: {
    parts?: GeminiPart[];
  };
};

type GeminiGenerateResponse = {
  candidates?: GeminiCandidate[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

export type GeminiApiContent = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

@Injectable()
export class GeminiService {
  private readonly logger = this.appLogger.child('GeminiService');
  private readonly baseUrl =
    process.env.GEMINI_API_BASE_URL ||
    'https://generativelanguage.googleapis.com';
  private readonly model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  private readonly apiKey = process.env.GEMINI_API_KEY;
  private readonly axiosClient: AxiosInstance;
  private readonly maxRetries = 3;

  constructor(
    private readonly appLogger: AppLogger,
    private readonly aiUsageService: AiUsageService,
  ) {
    if (!this.apiKey) {
      throw new InternalError('GEMINI_API_KEY is not configured');
    }

    const proxy = this.buildProxyConfig();
    this.axiosClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      ...(proxy ? { proxy } : {}),
    });
  }

  async generate(prompt: string): Promise<string> {
    return this.generateFromContents([
      { role: 'user', parts: [{ text: prompt }] },
    ]);
  }

  async generateFromContents(contents: GeminiApiContent[]): Promise<string> {
    const body = { contents };

    let lastError: unknown;

    for (let attempt = 0; attempt < this.maxRetries; attempt += 1) {
      const started = Date.now();
      try {
        const response = await this.axiosClient.post<GeminiGenerateResponse>(
          `/v1/models/${this.model}:generateContent`,
          body,
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': this.apiKey,
            },
          },
        );

        this.aiUsageService.trackTokenUsage({
          promptTokens: response.data.usageMetadata?.promptTokenCount,
          completionTokens: response.data.usageMetadata?.candidatesTokenCount,
          totalTokens: response.data.usageMetadata?.totalTokenCount,
        });

        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          throw new ServiceUnavailableError('Gemini returned empty response');
        }
        this.aiUsageService.recordGeminiLatencyMs(Date.now() - started);
        return text;
      } catch (error) {
        lastError = error;
        if (!this.shouldRetry(error, attempt)) {
          break;
        }
        await this.sleep(250 * 2 ** attempt);
      }
    }

    if (lastError !== undefined) {
      this.aiUsageService.recordDiagnostic(lastError);
    }
    throw this.mapGeminiError(lastError);
  }

  private buildProxyConfig(): AxiosRequestConfig['proxy'] | undefined {
    const host = process.env.AI_PROXY_HOST;
    const portRaw = process.env.AI_PROXY_PORT;
    const protocol = process.env.AI_PROXY_PROTOCOL || 'http';

    if (!host || !portRaw) {
      return undefined;
    }

    const port = Number.parseInt(portRaw, 10);
    if (!Number.isFinite(port) || port <= 0) {
      throw new InternalError('AI_PROXY_PORT must be a positive integer');
    }

    this.logger.log(`Gemini proxy enabled (${protocol}://${host}:${port})`);

    return { host, port, protocol };
  }

  private mapGeminiError(error: unknown): Error {
    if (
      error instanceof ServiceUnavailableError ||
      error instanceof InternalError
    ) {
      return error;
    }
    if (error === undefined || error === null) {
      return new ServiceUnavailableError('Gemini request failed');
    }
    if (!axios.isAxiosError(error)) {
      return new ServiceUnavailableError('Gemini request failed');
    }

    const status = error.response?.status;
    const message = this.getUpstreamMessage(error);

    if (status === 400 && /location is not supported/i.test(message)) {
      return new ServiceUnavailableError(
        'Gemini is unavailable from current network location',
      );
    }

    if (status === 401 || status === 403) {
      this.logger.error(
        'Gemini authentication failed (check API key and project settings)',
      );
      return new InternalError('Gemini authentication failed');
    }

    if (status === 429 || status === 503) {
      return new ServiceUnavailableError('Gemini is temporarily unavailable');
    }

    if (error.code === 'ECONNABORTED' || !error.response) {
      return new ServiceUnavailableError(
        'Gemini request timeout or network error',
      );
    }

    return new ServiceUnavailableError('Gemini request failed');
  }

  private shouldRetry(error: unknown, attempt: number): boolean {
    if (attempt >= this.maxRetries - 1 || !axios.isAxiosError(error)) {
      return false;
    }
    const status = error.response?.status;
    return status === 429 || status === 503 || !error.response;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private getUpstreamMessage(error: AxiosError): string {
    const data = error.response?.data;
    if (
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'object'
    ) {
      const upstream = (data as { error?: { message?: unknown } }).error;
      if (typeof upstream?.message === 'string') {
        return upstream.message;
      }
    }
    return '';
  }
}
