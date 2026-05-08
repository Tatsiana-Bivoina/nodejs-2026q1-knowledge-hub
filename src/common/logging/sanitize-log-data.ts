const SECRET_FIELDS = new Set([
  'password',
  'accessToken',
  'refreshToken',
  'token',
  'authorization',
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function sanitizeLogData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeLogData(item));
  }
  if (!isObject(value)) {
    return value;
  }

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (SECRET_FIELDS.has(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    out[key] = sanitizeLogData(raw);
  }
  return out;
}
