export type AnalyzeSeverity = 'info' | 'warning' | 'error';

export type ValidatedAnalyzeOutput = {
  analysis: string;
  suggestions: string[];
  severity: AnalyzeSeverity;
};

export type ValidatedTranslateOutput = {
  translatedText: string;
  detectedLanguage: string;
};

const MAX_SUGGESTIONS = 40;
const MAX_SUGGESTION_LENGTH = 800;
const MAX_LANGUAGE_TAG_LENGTH = 64;

function trimNonEmptyStrings(items: unknown[]): string[] {
  const out: string[] = [];
  for (const item of items) {
    if (typeof item !== 'string') {
      continue;
    }
    const t = item.trim();
    if (!t) {
      continue;
    }
    out.push(t.slice(0, MAX_SUGGESTION_LENGTH));
    if (out.length >= MAX_SUGGESTIONS) {
      break;
    }
  }
  return out;
}

export function validateAnalyzeOutput(
  parsed: Record<string, unknown>,
  rawTextFallback: string,
): ValidatedAnalyzeOutput {
  const analysisRaw = parsed.analysis;
  const analysis =
    typeof analysisRaw === 'string' && analysisRaw.trim().length > 0
      ? analysisRaw.trim()
      : rawTextFallback.trim() || 'No structured analysis could be parsed.';

  const suggestions = Array.isArray(parsed.suggestions)
    ? trimNonEmptyStrings(parsed.suggestions)
    : [];

  let severity: AnalyzeSeverity = 'info';
  if (parsed.severity === 'warning' || parsed.severity === 'error') {
    severity = parsed.severity;
  }

  return { analysis, suggestions, severity };
}

export function validateTranslateOutput(
  parsed: Record<string, unknown>,
  rawTextFallback: string,
  fallbackDetectedLanguage: string,
): ValidatedTranslateOutput {
  const tt = parsed.translatedText;
  const translatedText =
    typeof tt === 'string' && tt.trim().length > 0
      ? tt.trim()
      : rawTextFallback.trim();

  const dl = parsed.detectedLanguage;
  let detectedLanguage =
    typeof dl === 'string' && dl.trim().length > 0
      ? dl.trim().slice(0, MAX_LANGUAGE_TAG_LENGTH)
      : fallbackDetectedLanguage;

  if (!detectedLanguage || detectedLanguage === 'unknown') {
    detectedLanguage = fallbackDetectedLanguage || 'unknown';
  }

  return { translatedText, detectedLanguage };
}
