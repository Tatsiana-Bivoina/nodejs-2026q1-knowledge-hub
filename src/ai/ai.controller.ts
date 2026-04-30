import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeminiService } from './gemini.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Get('test')
  @ApiOperation({ summary: 'Test Gemini API integration' })
  async test() {
    const text = await this.geminiService.generate('Say hello from Gemini');
    return { text };
  }
}
