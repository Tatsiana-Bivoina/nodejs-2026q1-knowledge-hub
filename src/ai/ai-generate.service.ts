import { Injectable } from '@nestjs/common';
import { GenerateAiDto } from './dto/generate-ai.dto';
import { AiConversationService } from './ai-conversation.service';
import { GeminiService } from './gemini.service';

@Injectable()
export class AiGenerateService {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly conversationService: AiConversationService,
  ) {}

  async run(dto: GenerateAiDto): Promise<{ text: string; sessionId: string }> {
    const { sessionId, contents } =
      this.conversationService.appendUserAndBuildContents(
        dto.sessionId,
        dto.prompt,
      );

    const text = await this.geminiService.generateFromContents(contents);
    this.conversationService.appendModelTurn(sessionId, text);
    return { text, sessionId };
  }
}
