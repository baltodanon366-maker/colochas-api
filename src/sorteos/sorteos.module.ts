import { Module } from '@nestjs/common';
import { SorteosService } from './sorteos.service';
import { SorteosController } from './sorteos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SorteosController],
  providers: [SorteosService],
  exports: [SorteosService],
})
export class SorteosModule {}

