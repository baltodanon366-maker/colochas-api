import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermisosModule } from './permisos/permisos.module';
import { TurnosModule } from './turnos/turnos.module';
import { ConfiguracionesModule } from './configuraciones/configuraciones.module';
import { VentasModule } from './ventas/ventas.module';
import { CierresTurnoModule } from './cierres-turno/cierres-turno.module';
import { RestriccionesModule } from './restricciones/restricciones.module';
import { AlertasModule } from './alertas/alertas.module';
import { KpisModule } from './kpis/kpis.module';
import { HistorialModule } from './historial/historial.module';
import { LimpiezaModule } from './limpieza/limpieza.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermisosModule,
    TurnosModule,
    ConfiguracionesModule,
    VentasModule,
    CierresTurnoModule,
    RestriccionesModule,
    AlertasModule,
    KpisModule,
    HistorialModule,
    LimpiezaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
