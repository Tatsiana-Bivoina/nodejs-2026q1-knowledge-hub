import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { ParseUuidPipe } from './parse-uuid.pipe';

describe('ParseUuidPipe', () => {
  const pipe = new ParseUuidPipe();

  it('passes valid UUID unchanged', () => {
    const value = 'c17f8e8b-1ab1-46b3-a44b-7fbdbfb4af9d';
    expect(pipe.transform(value)).toBe(value);
  });

  it('throws BadRequestException for malformed value', () => {
    expect(() => pipe.transform('not-a-uuid')).toThrow(BadRequestException);
  });
});
