import { request } from './lib';
import { StatusCodes } from 'http-status-codes';
import { getAdminTokenAndUserId } from './utils';
import { aiRoutes } from './endpoints';

const randomNonExistentArticleId = '0a35dd62-e09f-444b-a628-f4e7c6954f57';

describe('AI (e2e)', () => {
  const commonHeaders: Record<string, string> = { Accept: 'application/json' };

  beforeAll(async () => {
    const { token } = await getAdminTokenAndUserId(request);
    commonHeaders.Authorization = token;
  });

  it('should return 401 when calling AI route without token', async () => {
    const res = await request
      .post(aiRoutes.summarize(randomNonExistentArticleId))
      .set({ Accept: 'application/json' })
      .send({});

    expect(res.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it('should return 404 when summarizing a missing article', async () => {
    const res = await request
      .post(aiRoutes.summarize(randomNonExistentArticleId))
      .set(commonHeaders)
      .send({});

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
    expect(res.body.message).toContain('Article not found');
  });

  it('should return 404 when translating a missing article', async () => {
    const res = await request
      .post(aiRoutes.translate(randomNonExistentArticleId))
      .set(commonHeaders)
      .send({ targetLanguage: 'English' });

    expect(res.status).toBe(StatusCodes.NOT_FOUND);
  });

  it('should return 400 when targetLanguage is missing for translate', async () => {
    const res = await request
      .post(aiRoutes.translate(randomNonExistentArticleId))
      .set(commonHeaders)
      .send({});

    expect(res.status).toBe(StatusCodes.BAD_REQUEST);
  });

  it('should return usage snapshot from GET /ai/usage', async () => {
    const res = await request.get(aiRoutes.usage).set(commonHeaders);

    expect(res.status).toBe(StatusCodes.OK);
    expect(res.body).toMatchObject({
      totalRequests: expect.any(Number),
      requestsByEndpoint: expect.any(Object),
      tokenUsage: {
        promptTokens: expect.any(Number),
        completionTokens: expect.any(Number),
        totalTokens: expect.any(Number),
      },
      geminiLatency: {
        averageMs: expect.any(Number),
        totalMs: expect.any(Number),
        sampleCount: expect.any(Number),
      },
      cache: {
        hits: expect.any(Number),
        misses: expect.any(Number),
        hitRatio: expect.any(Number),
      },
    });
  });
});
