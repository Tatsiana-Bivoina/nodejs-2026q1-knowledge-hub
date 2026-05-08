import { Module } from '@nestjs/common';
import { AiModule } from '../ai.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
