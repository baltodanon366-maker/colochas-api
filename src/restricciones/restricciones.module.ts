import { Module } from '@nestjs/common';
import { RestriccionesService } from './restricciones.service';
import { RestriccionesController } from './restricciones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RestriccionesController],
  providers: [RestriccionesService],
  exports: [RestriccionesService],
})
export class RestriccionesModule {}

