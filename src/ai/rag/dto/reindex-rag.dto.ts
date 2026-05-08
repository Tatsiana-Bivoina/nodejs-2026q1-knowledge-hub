import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ReindexRagDto {
  @ApiPropertyOptional({
    description: 'Index only published articles',
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyPublished?: boolean;

  @ApiPropertyOptional({
    description: 'Optional list of article ids for selective indexing',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  articleIds?: string[];
}
