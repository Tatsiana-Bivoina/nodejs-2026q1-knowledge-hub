import { SummaryLength } from '../dto/summarize-article.dto';

function lengthInstruction(maxLength: SummaryLength): string {
  if (maxLength === 'short') {
    return 'Maximum 2 short paragraphs.';
  }
  if (maxLength === 'detailed') {
    return 'Maximum 6 detailed paragraphs with key points.';
  }
  return 'Maximum 4 medium-length paragraphs.';
}

export function buildSummarizePrompt(
  articleTitle: string,
  articleContent: string,
  maxLength: SummaryLength,
): string {
  return [
    'You are an assistant that summarizes technical and educational articles.',
    `Summarize the article below. ${lengthInstruction(maxLength)}`,
    'Keep factual meaning and avoid adding external details.',
    'Return plain text only.',
    '',
    `Title: ${articleTitle}`,
    'Content:',
    articleContent,
  ].join('\n');
}
