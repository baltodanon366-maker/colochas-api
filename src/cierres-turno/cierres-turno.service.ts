import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CerrarTurnoDto } from './dto/cerrar-turno.dto';

@Injectable()
export class CierresTurnoService {
  constructor(private prisma: PrismaService) {}

  async cerrarTurno(cerrarTurnoDto: CerrarTurnoDto, cerradoPor: number) {
    const { turnoId, fecha, observaciones } = cerrarTurnoDto;

    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT cerrar_turno(
        ${turnoId}::integer,
        ${fecha}::date,
        ${cerradoPor}::integer,
        ${observaciones || null}
      ) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new BadRequestException(data?.error || 'Error al cerrar turno');
    }

    return data;
  }

  async obtenerCierre(turnoId: number, fecha: string) {
    try {
      const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
        SELECT obtener_cierre_turno(${turnoId}::integer, ${fecha}::date) as resultado
      `;

      const data = result[0]?.resultado;

      if (!data || !data.exito) {
        // Si no hay cierre, retornar estructura vacía en lugar de error
        return {
          exito: true,
          turno_id: turnoId,
          fecha,
          esta_cerrado: false,
          total_ventas: 0,
          total_monto: 0,
        };
      }

      return data;
    } catch (error: any) {
      // Si la función no existe o hay error SQL, retornar estructura vacía
      console.error('Error al obtener cierre:', error);
      return {
        exito: true,
        turno_id: turnoId,
        fecha,
        esta_cerrado: false,
        total_ventas: 0,
        total_monto: 0,
      };
    }
  }

  // Método eliminado: obtenerVentasPorTurno
  // Usar GET /api/v1/historial/ventas?turnoId=:turnoId&fechaInicio=:fecha&fechaFin=:fecha
}

