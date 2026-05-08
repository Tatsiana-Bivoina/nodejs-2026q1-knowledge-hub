import { IsIn, IsOptional } from 'class-validator';

export const ANALYZE_TASK_VALUES = [
  'review',
  'bugs',
  'optimize',
  'explain',
] as const;
export type AnalyzeTask = (typeof ANALYZE_TASK_VALUES)[number];

export class AnalyzeArticleDto {
  @IsOptional()
  @IsIn(ANALYZE_TASK_VALUES)
  task: AnalyzeTask = 'review';
}
