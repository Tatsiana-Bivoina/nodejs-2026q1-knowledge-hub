import { Injectable } from '@nestjs/common';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { AppLogger } from '../common/logging/app-logger';
import {
  InternalError,
  ServiceUnavailableError,
} from '../common/errors/http-errors';

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

  constructor(private readonly appLogger: AppLogger) {
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
    const body = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
    };

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

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new ServiceUnavailableError('Gemini returned empty response');
      }
      return text;
    } catch (error) {
      throw this.mapGeminiError(error);
    }
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
