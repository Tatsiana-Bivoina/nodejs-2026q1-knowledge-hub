import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class GenerateAiDto {
  @ApiPropertyOptional({
    description:
      'Optional. Reuse the returned sessionId on the next call to keep short-term conversation context.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID('4')
  sessionId?: string;

  @ApiProperty({
    example: 'Summarize the benefits of TypeScript in one paragraph.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(32_000)
  prompt!: string;
}
