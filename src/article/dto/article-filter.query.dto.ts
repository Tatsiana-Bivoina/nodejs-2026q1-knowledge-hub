import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ArticleStatus } from '../../common/enums/article-status.enum';

export class ArticleFilterQueryDto {
  @ApiPropertyOptional({ enum: ArticleStatus })
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;
}
