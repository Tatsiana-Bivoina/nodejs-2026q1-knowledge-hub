import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppLogger } from './common/logging/app-logger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(AppLogger);
  app.useLogger(logger);
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Knowledge Hub')
    .setDescription('OpenAPI documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('doc', app, document);

  const port = parseInt(process.env.PORT || '4000', 10);
  await app.listen(port);
  logger.log(`Application started on port ${port}`, 'Bootstrap');

  const shutdown = async (reason: 'uncaughtException' | 'unhandledRejection', error: unknown) => {
    const trace = error instanceof Error ? error.stack : undefined;
    if (reason === 'uncaughtException') {
      logger.fatal(`Process-level error: ${reason}`, trace, 'Process');
    } else {
      logger.error(`Process-level error: ${reason}`, trace, 'Process');
    }
    try {
      await app.close();
    } finally {
      process.exit(1);
    }
  };

  process.on('uncaughtException', (error) => {
    void shutdown('uncaughtException', error);
  });

  process.on('unhandledRejection', (reason) => {
    void shutdown('unhandledRejection', reason);
  });
}

bootstrap();
