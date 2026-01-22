import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KpisService {
  constructor(private prisma: PrismaService) {}

  async obtenerNumeroMasVendido(fechaInicio: string, fechaFin: string) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT obtener_numero_mas_vendido(${fechaInicio}::date, ${fechaFin}::date) as resultado
    `;

    return result[0]?.resultado || [];
  }

  // Método eliminado: obtenerNumeroMasVecesGanador
  // No se utilizará más en el sistema

  async obtenerEmpleadoMasVentas(fechaInicio: string, fechaFin: string) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT obtener_empleado_mas_ventas(${fechaInicio}::date, ${fechaFin}::date) as resultado
    `;

    return result[0]?.resultado || [];
  }

  async obtenerVentasHoy() {
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Obtener todas las ventas de hoy
    const ventas = await this.prisma.venta.findMany({
      where: {
        fecha: new Date(hoy),
      },
      include: {
        detallesVenta: true, // Nombre correcto de la relación en Prisma
        turno: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    // Calcular totales
    const totalVentas = ventas.length;
    const totalMonto = ventas.reduce((sum, venta) => sum + Number(venta.total || 0), 0);

    // Agrupar por turno
    const ventasPorTurno = ventas.reduce((acc, venta) => {
      const turnoId = venta.turnoId;
      const turnoNombre = venta.turno?.nombre || `Turno ${turnoId}`;
      
      if (!acc[turnoId]) {
        acc[turnoId] = {
          turnoId,
          turnoNombre,
          cantidad: 0,
          monto: 0,
        };
      }
      
      acc[turnoId].cantidad += 1;
      acc[turnoId].monto += Number(venta.total || 0);
      
      return acc;
    }, {} as Record<number, { turnoId: number; turnoNombre: string; cantidad: number; monto: number }>);

    return {
      totalVentas,
      totalMonto,
      ventasPorTurno: Object.values(ventasPorTurno),
    };
  }
}

