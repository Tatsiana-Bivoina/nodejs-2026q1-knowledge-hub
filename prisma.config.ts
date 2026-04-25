import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// `prisma generate` runs during Docker image build where DATABASE_URL is unset.
// Migrations and the running app use the real URL from .env / docker-compose.
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/prisma_build_placeholder?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
