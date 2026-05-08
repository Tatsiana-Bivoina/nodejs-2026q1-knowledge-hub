import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { buildGeneratePrompt } from './prompts/generate.prompt';

export type GeminiContentItem = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

type Turn = { role: 'user' | 'model'; text: string };

type SessionRecord = {
  turns: Turn[];
  expiresAtMs: number;
};

@Injectable()
export class AiConversationService {
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly ttlMs = this.resolveTtlMs();
  private readonly maxTurns = 24;

  createSessionId(): string {
    return randomUUID();
  }

  /**
   * Appends a user turn. Creates or refreshes session. Returns session id and Gemini `contents` payload.
   */
  appendUserAndBuildContents(
    sessionId: string | undefined,
    userText: string,
  ): { sessionId: string; contents: GeminiContentItem[] } {
    const now = Date.now();
    let id = sessionId?.trim() || undefined;
    let record = id ? this.sessions.get(id) : undefined;

    if (!id || !record || record.expiresAtMs <= now) {
      id = this.createSessionId();
      record = { turns: [], expiresAtMs: now + this.ttlMs };
      this.sessions.set(id, record);
    }

    record.turns.push({ role: 'user', text: userText.trim() });
    this.trimOldTurns(record);
    record.expiresAtMs = now + this.ttlMs;

    const contents = this.turnsToGeminiContents(record.turns);
    return { sessionId: id, contents };
  }

  appendModelTurn(sessionId: string, modelText: string): void {
    const record = this.sessions.get(sessionId);
    if (!record) {
      return;
    }
    record.turns.push({ role: 'model', text: modelText.trim() });
    this.trimOldTurns(record);
    record.expiresAtMs = Date.now() + this.ttlMs;
  }

  private turnsToGeminiContents(turns: Turn[]): GeminiContentItem[] {
    return turns.map((t) =>
      t.role === 'user'
        ? {
            role: 'user',
            parts: [{ text: buildGeneratePrompt(t.text) }],
          }
        : {
            role: 'model',
            parts: [{ text: t.text }],
          },
    );
  }

  private trimOldTurns(record: SessionRecord): void {
    if (record.turns.length > this.maxTurns) {
      const drop = record.turns.length - this.maxTurns;
      record.turns.splice(0, drop);
    }
  }

  private resolveTtlMs(): number {
    const raw = process.env.AI_CONVERSATION_TTL_SEC || '900';
    const sec = Number.parseInt(raw, 10);
    const normalized = Number.isFinite(sec) && sec > 0 ? sec : 900;
    return normalized * 1000;
  }
}
