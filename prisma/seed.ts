import { PrismaClient, ArticleStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main(): Promise<void> {
  // Make seed repeatable
  await prisma.comment.deleteMany();
  await prisma.article.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  const saltRounds = Number.parseInt(process.env.CRYPT_SALT ?? '10', 10);
  const passwordHash = await bcrypt.hash('password123', saltRounds);

  const admin = await prisma.user.create({
    data: {
      login: 'admin',
      password: passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const editor = await prisma.user.create({
    data: {
      login: 'editor',
      password: passwordHash,
      role: UserRole.EDITOR,
    },
  });

  const category = await prisma.category.create({
    data: {
      name: 'NestJS',
      description: 'Notes and articles about NestJS',
    },
  });

  const [tagPrisma, tagNest, tagPostgres] = await Promise.all([
    prisma.tag.create({ data: { name: 'prisma' } }),
    prisma.tag.create({ data: { name: 'nestjs' } }),
    prisma.tag.create({ data: { name: 'postgres' } }),
  ]);

  const article = await prisma.article.create({
    data: {
      title: 'Prisma + NestJS: getting started',
      content:
        'This is seed content for the knowledge-hub project. Real articles will follow.',
      status: ArticleStatus.PUBLISHED,
      author: { connect: { id: editor.id } },
      category: { connect: { id: category.id } },
      tags: {
        connect: [{ id: tagPrisma.id }, { id: tagNest.id }, { id: tagPostgres.id }],
      },
    },
  });

  await prisma.comment.createMany({
    data: [
      {
        content: 'Great start — looking forward to the next post!',
        articleId: article.id,
        authorId: admin.id,
      },
      {
        content: 'Useful, especially the Docker + DATABASE_URL bit.',
        articleId: article.id,
        authorId: editor.id,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });

