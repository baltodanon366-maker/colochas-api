import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LimpiezaService {
  constructor(private prisma: PrismaService) {}

  /**
   * Limpia datos antiguos (más de 90 días) de las tablas especificadas
   * @param diasAntiguedad - Días de antigüedad para considerar datos antiguos (default: 90)
   */
  async limpiarDatosAntiguos(diasAntiguedad: number = 90): Promise<{
    ventasEliminadas: number;
    detallesEliminados: number;
    alertasEliminadas: number;
    auditoriaEliminada: number;
    restriccionesEliminadas: number;
  }> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    try {
      // 1. Eliminar detalles de venta antiguos (primero por foreign key)
      const detallesEliminados = await this.prisma.$executeRaw`
        DELETE FROM detalles_venta
        WHERE venta_id IN (
          SELECT id FROM ventas
          WHERE fecha < ${fechaLimite}::DATE
        )
      `;

      // 2. Eliminar ventas antiguas
      const ventasEliminadas = await this.prisma.$executeRaw`
        DELETE FROM ventas
        WHERE fecha < ${fechaLimite}::DATE
      `;

      // 3. Eliminar alertas resueltas antiguas
      const alertasEliminadas = await this.prisma.$executeRaw`
        DELETE FROM alertas
        WHERE estado = 'resuelta'
        AND resuelta_en < ${fechaLimite}::TIMESTAMP
      `;

      // 4. Eliminar registros de auditoría antiguos
      const auditoriaEliminada = await this.prisma.$executeRaw`
        DELETE FROM auditoria
        WHERE created_at < ${fechaLimite}::TIMESTAMP
      `;

      // 5. Eliminar restricciones antiguas (que no están activas)
      const restriccionesEliminadas = await this.prisma.$executeRaw`
        DELETE FROM restricciones_numeros
        WHERE fecha < ${fechaLimite}::DATE
        AND esta_restringido = false
      `;

      return {
        ventasEliminadas: Number(ventasEliminadas),
        detallesEliminados: Number(detallesEliminados),
        alertasEliminadas: Number(alertasEliminadas),
        auditoriaEliminada: Number(auditoriaEliminada),
        restriccionesEliminadas: Number(restriccionesEliminadas),
      };
    } catch (error) {
      console.error('Error al limpiar datos antiguos:', error);
      throw new Error('Error al ejecutar limpieza de datos antiguos');
    }
  }

  /**
   * Obtiene estadísticas de datos que serían eliminados
   */
  async obtenerEstadisticasLimpieza(diasAntiguedad: number = 90): Promise<{
    ventasAConsiderar: number;
    detallesAConsiderar: number;
    alertasAConsiderar: number;
    auditoriaAConsiderar: number;
    restriccionesAConsiderar: number;
  }> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

    const [ventas, detalles, alertas, auditoria, restricciones] = await Promise.all([
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM ventas WHERE fecha < ${fechaLimite}::DATE
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM detalles_venta
        WHERE venta_id IN (SELECT id FROM ventas WHERE fecha < ${fechaLimite}::DATE)
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM alertas
        WHERE estado = 'resuelta' AND resuelta_en < ${fechaLimite}::TIMESTAMP
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM auditoria
        WHERE created_at < ${fechaLimite}::TIMESTAMP
      `,
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM restricciones_numeros
        WHERE fecha < ${fechaLimite}::DATE AND esta_restringido = false
      `,
    ]);

    return {
      ventasAConsiderar: Number(ventas[0]?.count || 0),
      detallesAConsiderar: Number(detalles[0]?.count || 0),
      alertasAConsiderar: Number(alertas[0]?.count || 0),
      auditoriaAConsiderar: Number(auditoria[0]?.count || 0),
      restriccionesAConsiderar: Number(restricciones[0]?.count || 0),
    };
  }
}
