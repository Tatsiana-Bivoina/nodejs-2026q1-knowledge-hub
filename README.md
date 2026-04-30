# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js `>=24.10.0` - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.
- Docker Desktop (for Docker-based run and PostgreSQL).

## Downloading

```
git clone <repository-url>
cd nodejs-2026q1-knowledge-hub
```

## Environment Variables

Create local environment file:

```
cp .env.example .env
```

Main variables:

- `PORT=4000`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_hub?schema=public` (for local app run)
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_HOST=db`
- `POSTGRES_PORT=5432`
- `GEMINI_API_KEY=your-gemini-api-key`
- `GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com`
- `GEMINI_MODEL=gemini-2.0-flash`
- `AI_RATE_LIMIT_RPM=20` (max AI requests per minute per client IP)
- `AI_CACHE_TTL_SEC=300` (in-memory cache TTL for AI summarize/translate responses)
- `AI_CONVERSATION_TTL_SEC=900` (TTL for in-memory conversation sessions used by `POST /ai/generate`)

Optional proxy variables for Gemini (useful for region bypass with local Fiddler):

- `AI_PROXY_HOST=127.0.0.1` (or `host.docker.internal` if app runs in Docker)
- `AI_PROXY_PORT=8888`
- `AI_PROXY_PROTOCOL=http`

When app runs inside Docker Compose, `DATABASE_URL` is overridden in `docker-compose.yml` to use host `db`.

If you use Docker PostgreSQL on `localhost:5432`, make sure local Postgres service (for example Postgres.app) is stopped, otherwise host and container DB can be mixed.

## AI usage and rate limit

- All `/ai/*` routes are protected by AI rate limiting (`AI_RATE_LIMIT_RPM`, default `20`).
- If exceeded, API returns `429 Too Many Requests` with `Retry-After` header.
- In-memory usage stats are available at `GET /ai/usage`:
  - total AI requests
  - requests per endpoint
  - aggregated token usage (when Gemini returns usage metadata)
  - average Gemini latency (successful calls) and total time samples
  - summarize/translate **cache** hits, misses, and hit ratio
  - last upstream error **category** and HTTP status (no secrets in the payload)

## Knowledge Hub + Gemini (assignment)

### 1) How to get a Google Gemini API key

1. Open [Google AI Studio](https://aistudio.google.com) and sign in with a Google account.
2. If the site or API says your **location is not supported**, use a **supported network path** (for example a desktop VPN with a **US** exit) before creating the key. Browser-only VPN extensions do not change traffic from the terminal or Docker; use a **system VPN** for server-side `curl` and Nest, or route HTTP through a local proxy (see [Gemini proxy quick setup](#gemini-proxy-quick-setup-fiddler--mitmproxy)) so outbound requests use the same path.
3. In AI Studio, create or pick a project.
4. Go to **API keys** → **Create API key**.
5. Copy the key into `.env` as `GEMINI_API_KEY` (never commit the real key).

### 2) Which model is used

- Set `GEMINI_MODEL` in `.env` (for example `gemini-2.0-flash` or `gemini-2.5-flash` if your key has access). The app calls `https://generativelanguage.googleapis.com` and the `generateContent` API for that model.

### 3) After clone: required env and where the key lives

- Copy `cp .env.example .env`.
- Put the real key only in local `.env` (and in your password manager), not in git.
- Main variables: `GEMINI_API_KEY`, `GEMINI_API_BASE_URL`, `GEMINI_MODEL`, `AI_RATE_LIMIT_RPM`, `AI_CACHE_TTL_SEC`, and optional `AI_PROXY_*` for HTTP proxying (see above).
- For **Docker**, use `AI_PROXY_HOST=host.docker.internal` if the proxy runs on the host (for example `mitmweb` on `8888`).

### 4) Run the app and test AI endpoints

1. Run DB migrations and seed (see [Prisma](#prisma)) so at least one article exists for article-based AI routes.
2. Start the API (`npm start` or `docker compose up --build`).
3. Open Swagger at `http://localhost:4000/doc`, click **Authorize**, and paste `Bearer <accessToken>` (get tokens via `POST /auth/login` after seed — default seed users include `admin` / `password123`).
4. Try:
   - `POST /ai/articles/{articleId}/summarize` with body `{ "maxLength": "medium" }` (optional).
   - `POST /ai/articles/{articleId}/translate` with `{ "targetLanguage": "English" }`.
   - `POST /ai/articles/{articleId}/analyze` with `{ "task": "review" }` (optional).
   - Optional: `POST /ai/generate` with `{ "prompt": "Your question" }` and optional `"sessionId"` (UUID from the previous response) to keep **short-term conversation context** in memory.
   - `GET /ai/test` — minimal Gemini connectivity check (requires auth).

Example with `curl` (replace `TOKEN` and `ARTICLE_ID`):

```bash
curl -s http://localhost:4000/ai/articles/ARTICLE_ID/summarize \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"maxLength":"short"}'
```

### 5) Known limitations

- **Free tier quotas**: Gemini may return rate-limit / quota errors; the service maps many upstream failures to `503` and retries some transient cases.
- **Latency**: LLM calls can be slow; tune timeouts only if you accept operational trade-offs.
- **Regional availability**: Some regions are blocked for the API; use a supported egress path (VPN/proxy) where needed.
- **In-memory cache and usage**: Summarize/translate responses are cached in process memory with TTL; usage counters reset on restart.
- **Conversation sessions** for `POST /ai/generate` are stored in process memory (not shared across instances); they expire after `AI_CONVERSATION_TTL_SEC`.

### 6) Structured LLM output and observability (rubric “Hacker” items)

- **Schema-style validation**: JSON returned by Gemini for **analyze** and **translate** is passed through `src/ai/validation/ai-output.validation.ts` (field checks, length limits, safe fallbacks to raw text when needed).
- **Metrics** on `GET /ai/usage`: token sums, per-endpoint request counts, **average Gemini latency** (successful calls), **cache hit ratio** for summarize/translate, and a small **last error** diagnostic (category + optional HTTP status, no API key or response body).
- **Session context** for `POST /ai/generate`: request body may include `sessionId` from the previous response; the server keeps a short in-memory transcript and sends multi-turn `contents` to Gemini.

## Gemini proxy quick setup (Fiddler / mitmproxy)

1. Start a local HTTP proxy on port **8888** (for example **mitmweb**: `mitmweb --listen-port 8888 --web-port 8081`, or Fiddler with the same listen port).
2. Use a **system VPN** (or other egress) if Gemini rejects your region; **mitmproxy alone does not change country** — it only forwards traffic.
3. Set proxy env vars in `.env`:

```dotenv
AI_PROXY_HOST=127.0.0.1
AI_PROXY_PORT=8888
AI_PROXY_PROTOCOL=http
```

For Docker, prefer `AI_PROXY_HOST=host.docker.internal`.

4. Start the app and call `GET /ai/test` (with a valid Bearer token in Swagger or curl).

## Installing NPM modules

```
npm install
```

## Prisma

Project uses Prisma 7 with `prisma.config.ts` (datasource URL is configured there, not in `schema.prisma`).

Generate Prisma client:

```bash
npm run prisma:generate
```

Apply local migrations during development:

```bash
npm run prisma:migrate
```

Apply existing migrations (CI/prod/Docker):

```bash
npx prisma migrate deploy
```

Seed database:

```bash
npm run prisma:seed
```

Reset DB + reapply migrations + seed:

```bash
npx prisma migrate reset --force
```

## Running application (without Docker)

```
npm start
```

After starting the app on port (4000 as default) you can open
in your browser OpenAPI documentation by typing http://localhost:4000/doc/.
For more information about OpenAPI/Swagger please visit https://swagger.io/.

## Docker

### Start full stack (app + PostgreSQL)

```bash
docker compose up --build
```

After startup:

- API: http://localhost:4000
- Swagger: http://localhost:4000/doc
- PostgreSQL: `localhost:5432`

Apply migrations and seed (from host terminal):

```bash
npx prisma migrate deploy
npm run prisma:seed
```

Optional quick check that Docker DB is available on `5432`:

```bash
lsof -nP -iTCP:5432 -sTCP:LISTEN
```

You should see Docker proxy/container listener, not a local Postgres service.

### Start with Adminer (debug profile)

```bash
docker compose --profile debug up --build
```

Adminer: http://localhost:8080

### Stop containers

```bash
docker compose down
```

### Stop containers and remove volume

```bash
docker compose down -v
```

### Security scan of image

Use an image name with a namespace prefix so Docker Scout does not try to pull `library/knowledge-hub` from Docker Hub:

```bash
docker build -t local/knowledge-hub:scan .
docker scout cves local/knowledge-hub:scan
```

or

```bash
trivy image local/knowledge-hub:scan
```

Summarize the scan results (or state that there are no **critical** findings) in the PR description.

### Docker Hub image

Published application image:

- Repository: [hub.docker.com/r/tanyabivoina/knowledge-hub](https://hub.docker.com/r/tanyabivoina/knowledge-hub)
- Pull: `docker pull tanyabivoina/knowledge-hub:latest`

Build and push an update (after `docker login`):

```bash
docker build -t tanyabivoina/knowledge-hub:latest .
docker push tanyabivoina/knowledge-hub:latest
```

**Note:** `docker push` takes a single argument — the image name and tag only (no trailing `.`).

## Testing

Before tests, make sure API is running (`npm start` or `docker compose up`) and DB migrations are applied.

To run base tests:

```
npm run test
```

The API must be running and the database must be migrated (and usually seeded) before e2e tests. For example, only the AI smoke suite:

```
npm run test -- test/ai.e2e.spec.ts
```

To run only one of all test suites

```
npm run test -- <path to suite>
```

To run all tests with authorization:

```
npm run test:auth
```

To run only specific test suite with authorization

```
npm run test:auth -- <path to suite>
```

To run refresh token tests

```
npm run test:refresh
```

To run RBAC (role-based access control) tests

```
npm run test:rbac
```

### Auto-fix and format

```
npm run lint
```

```
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging
