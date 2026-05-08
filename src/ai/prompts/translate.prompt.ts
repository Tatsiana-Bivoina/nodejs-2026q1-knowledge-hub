export function buildTranslatePrompt(
  articleTitle: string,
  articleContent: string,
  targetLanguage: string,
  sourceLanguage?: string,
): string {
  return [
    'You are a translation assistant.',
    `Translate the article into "${targetLanguage}".`,
    sourceLanguage
      ? `Assume source language is "${sourceLanguage}".`
      : 'Detect the source language automatically.',
    'Return JSON only with this schema:',
    '{"translatedText":"string","detectedLanguage":"string"}',
    '',
    `Title: ${articleTitle}`,
    'Content:',
    articleContent,
  ].join('\n');
}
