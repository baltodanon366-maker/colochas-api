import { Module } from '@nestjs/common';
import { ConfiguracionesService } from './configuraciones.service';
import { ConfiguracionesController } from './configuraciones.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ConfiguracionesController],
  providers: [ConfiguracionesService],
  exports: [ConfiguracionesService],
})
export class ConfiguracionesModule {}

