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

## Knowledge Hub RAG (Gemini + Qdrant)

### 1) How to get a Gemini API key (step-by-step)

1. Open [Google AI Studio](https://aistudio.google.com) and sign in.
2. Choose or create a Google Cloud project in AI Studio.
3. Open **API keys**.
4. Click **Create API key**.
5. Copy key to local `.env` as `GEMINI_API_KEY`.

If your region is restricted, use a supported egress path (system VPN and/or HTTP proxy for container traffic).

### 2) Gemini models used

- **Generation model**: configured via `GEMINI_MODEL` (current default in `.env.example`: `gemini-3.1-flash-lite`).
- **Embedding model**: configured via `GEMINI_EMBEDDING_MODEL` (default in `.env.example`: `gemini-embedding-002`; if unavailable for your key/region, use a supported one such as `gemini-embedding-001`).

### 3) Vector DB and Docker Compose setup

RAG uses **Qdrant** as external vector DB in Docker Compose:

- service: `vectordb` (`qdrant/qdrant:v1.13.4`)
- URL for app: `RAG_VECTOR_DB_URL=http://vectordb:6333`
- persistent storage: `qdrant-data` volume
- healthcheck + restart policy configured
- `app` waits for healthy `db` and healthy `vectordb`

### 4) Full startup flow after clone

1. Clone and install:

```bash
git clone <repository-url>
cd nodejs-2026q1-knowledge-hub
npm install
```

2. Configure env:

```bash
cp .env.example .env
```

Set at least:
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GEMINI_EMBEDDING_MODEL`
- `RAG_VECTOR_DB_URL`
- `RAG_VECTOR_COLLECTION`
- `RAG_CHUNK_SIZE`, `RAG_CHUNK_OVERLAP`
- `RAG_CONVERSATION_MAX_MESSAGES`

3. Start stack:

```bash
docker compose up --build
```

4. Apply migrations and seed:

```bash
npx prisma migrate deploy
npm run prisma:seed
```

5. Login and authorize in Swagger:
- Swagger: `http://localhost:4000/doc`
- get token via `POST /auth/login`
- click **Authorize** and pass `Bearer <token>`

6. Build vector index:

```bash
curl -X POST 'http://localhost:4000/ai/rag/index' \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"onlyPublished": true}'
```

7. Run semantic search:

```bash
curl -X POST 'http://localhost:4000/ai/rag/search' \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"query":"initial prisma setup for nest project","limit":5}'
```

8. Run RAG chat:

```bash
curl -X POST 'http://localhost:4000/ai/rag/chat' \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{"question":"What do we have about Prisma and NestJS?"}'
```

9. Optional conversation history:

```bash
curl -X GET 'http://localhost:4000/ai/rag/chat/<CONVERSATION_ID>/history' \
  -H 'Authorization: Bearer <TOKEN>'
```

### 5) Known limitations

- **Free-tier quotas**: low RPM/RPD can cause throttling (`429`) and temporary unavailability (`503`).
- **Latency**: indexing can be slow because each chunk requires embedding generation and vector upsert.
- **Regional availability**: Gemini model availability differs by region/account.
- **Model availability differences**: some embedding models may return `NOT_FOUND` for specific keys/regions; switch `GEMINI_EMBEDDING_MODEL` accordingly.
- **Conversation memory storage**: current chat memory is in-process (in-memory), so history resets on restart and is not shared between replicas.

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

### Start full stack (app + PostgreSQL + Qdrant)

```bash
docker compose up --build
```

After startup:

- API: http://localhost:4000
- Swagger: http://localhost:4000/doc
- PostgreSQL: `localhost:5432`
- Qdrant: `localhost:6333` (REST), `localhost:6334` (gRPC)

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
