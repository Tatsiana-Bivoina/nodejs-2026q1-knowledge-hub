# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.

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
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_HOST=db`
- `POSTGRES_PORT=5432`

## Installing NPM modules

```
npm install
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

After application running open new terminal and enter:

To run all tests without authorization

```
npm run test
```

To run only one of all test suites

```
npm run test -- <path to suite>
```

To run all test with authorization

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
