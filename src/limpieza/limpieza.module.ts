import { Module } from '@nestjs/common';
import { LimpiezaController } from './limpieza.controller';
import { LimpiezaService } from './limpieza.service';
import { LimpiezaScheduler } from './limpieza.scheduler';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LimpiezaController],
  providers: [LimpiezaService, LimpiezaScheduler],
  exports: [LimpiezaService],
})
export class LimpiezaModule {}
