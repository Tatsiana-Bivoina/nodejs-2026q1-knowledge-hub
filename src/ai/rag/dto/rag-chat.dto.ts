import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class RagChatDto {
  @ApiProperty({
    description: 'User question for RAG assistant',
    example: 'Explain how article status transitions work.',
  })
  @IsString()
  @IsNotEmpty()
  question!: string;

  @ApiPropertyOptional({
    description: 'Optional existing conversation id',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  conversationId?: string;
}
