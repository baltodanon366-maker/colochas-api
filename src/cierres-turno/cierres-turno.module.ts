import { Module } from '@nestjs/common';
import { CierresTurnoService } from './cierres-turno.service';
import { CierresTurnoController } from './cierres-turno.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CierresTurnoController],
  providers: [CierresTurnoService],
  exports: [CierresTurnoService],
})
export class CierresTurnoModule {}

