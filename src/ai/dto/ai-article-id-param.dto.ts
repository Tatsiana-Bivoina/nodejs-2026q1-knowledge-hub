import { IsUUID } from 'class-validator';

export class AiArticleIdParamDto {
  @IsUUID('4')
  articleId!: string;
}
