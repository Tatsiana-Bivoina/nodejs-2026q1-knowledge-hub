import { AnalyzeTask } from '../dto/analyze-article.dto';

export function buildAnalyzePrompt(
  articleTitle: string,
  articleContent: string,
  task: AnalyzeTask,
): string {
  return [
    'You are an assistant that analyzes article content.',
    `Run analysis task: "${task}".`,
    'Return JSON only with this schema:',
    '{"analysis":"string","suggestions":["string"],"severity":"info|warning|error"}',
    'Use "severity=error" only for critical correctness issues.',
    '',
    `Title: ${articleTitle}`,
    'Content:',
    articleContent,
  ].join('\n');
}
