import { IsIn, IsOptional } from 'class-validator';

export const SUMMARY_LENGTH_VALUES = ['short', 'medium', 'detailed'] as const;
export type SummaryLength = (typeof SUMMARY_LENGTH_VALUES)[number];

export class SummarizeArticleDto {
  @IsOptional()
  @IsIn(SUMMARY_LENGTH_VALUES)
  maxLength: SummaryLength = 'medium';
}
