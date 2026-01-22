import { Module } from '@nestjs/common';
import { KpisService } from './kpis.service';
import { KpisController } from './kpis.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [KpisController],
  providers: [KpisService],
  exports: [KpisService],
})
export class KpisModule {}

