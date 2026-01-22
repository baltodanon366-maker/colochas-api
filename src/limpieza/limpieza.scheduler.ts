import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LimpiezaService } from './limpieza.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LimpiezaScheduler implements OnModuleInit {
  private ultimaEjecucion: Date | null = null;
  private readonly DIAS_INTERVALO = 90;

  constructor(
    private limpiezaService: LimpiezaService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    // Cargar última fecha de ejecución desde la base de datos
    await this.cargarUltimaEjecucion();
  }

  private async cargarUltimaEjecucion() {
    try {
      const config = await this.prisma.configuracion.findUnique({
        where: { clave: 'limpieza_ultima_ejecucion' },
      });
      if (config && config.valor) {
        this.ultimaEjecucion = new Date(config.valor);
      }
    } catch (error) {
      console.error('Error al cargar última ejecución:', error);
    }
  }

  private async guardarUltimaEjecucion() {
    try {
      await this.prisma.configuracion.upsert({
        where: { clave: 'limpieza_ultima_ejecucion' },
        update: {
          valor: new Date().toISOString(),
          updatedAt: new Date(),
        },
        create: {
          clave: 'limpieza_ultima_ejecucion',
          valor: new Date().toISOString(),
          descripcion: 'Última fecha de ejecución de limpieza automática',
          tipo: 'date',
        },
      });
    } catch (error) {
      console.error('Error al guardar última ejecución:', error);
    }
  }

  // Ejecutar diariamente a las 2:00 AM y verificar si han pasado 90 días
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async limpiarDatosAutomaticamente() {
    const ahora = new Date();
    
    // Si no hay última ejecución o han pasado 90 días, ejecutar limpieza
    if (!this.ultimaEjecucion) {
      const diasDesdeInicio = Math.floor(
        (ahora.getTime() - new Date(2025, 0, 1).getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (diasDesdeInicio >= this.DIAS_INTERVALO) {
        await this.ejecutarLimpieza();
      }
    } else {
      const diasDesdeUltimaEjecucion = Math.floor(
        (ahora.getTime() - this.ultimaEjecucion.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diasDesdeUltimaEjecucion >= this.DIAS_INTERVALO) {
        await this.ejecutarLimpieza();
      }
    }
  }

  private async ejecutarLimpieza() {
    console.log('Iniciando limpieza automática de datos antiguos...');
    try {
      const resultado = await this.limpiezaService.limpiarDatosAntiguos(this.DIAS_INTERVALO);
      console.log('Limpieza completada:', resultado);
      this.ultimaEjecucion = new Date();
      await this.guardarUltimaEjecucion();
    } catch (error) {
      console.error('Error en limpieza automática:', error);
    }
  }
}
