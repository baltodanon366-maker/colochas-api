import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistorialService {
  constructor(private prisma: PrismaService) {}

  async obtenerHistorialVentas(
    usuarioId: number | null = null,
    fechaInicio: string | null = null,
    fechaFin: string | null = null,
    turnoId: number | null = null,
    page: number = 1,
    limit: number = 20,
  ) {
    try {
      // Construir la query SQL con manejo correcto de NULL
      const usuarioIdParam = usuarioId !== null ? `${usuarioId}::integer` : 'NULL::integer';
      const fechaInicioParam = fechaInicio ? `'${fechaInicio}'::date` : 'NULL::date';
      const fechaFinParam = fechaFin ? `'${fechaFin}'::date` : 'NULL::date';
      const turnoIdParam = turnoId !== null ? `${turnoId}::integer` : 'NULL::integer';

      const query = `
        SELECT obtener_historial_ventas(
          ${usuarioIdParam},
          ${fechaInicioParam},
          ${fechaFinParam},
          ${turnoIdParam},
          ${page}::integer,
          ${limit}::integer
        ) as resultado
      `;

      const result = await this.prisma.$queryRawUnsafe<Array<{ resultado: any }>>(query);

      const rawData = result[0]?.resultado;

      if (!rawData || !rawData.data || rawData.data.length === 0) {
        const paginationData = rawData?.pagination || {};
        return {
          data: [],
          pagination: {
            page: paginationData.page || page,
            limit: paginationData.limit || limit,
            total: paginationData.total || 0,
            totalPages: paginationData.total_pages || paginationData.totalPages || 0,
          },
        };
      }

      // Enriquecer cada venta con sus detalles y mapear vendedor a usuario
      const ventasEnriquecidas = await Promise.all(
        rawData.data.map(async (venta: any) => {
          // Obtener detalles de venta
          const detalles = await this.prisma.detalleVenta.findMany({
            where: { ventaId: venta.id },
            select: {
              id: true,
              numero: true,
              monto: true,
            },
          });

          // Mapear vendedor a usuario para compatibilidad con el frontend
          return {
            ...venta,
            usuario: venta.vendedor || null,
            detallesVenta: detalles,
            detalles: detalles, // Alias para compatibilidad
            numeroBoucher: venta.numero_boucher,
            fechaHora: venta.fecha_hora,
            turnoId: venta.turno?.id,
          };
        })
      );

      // Retornar en formato que el interceptor pueda transformar
      // El interceptor espera: { data: [...], pagination: { page, limit, total, totalPages } }
      const paginationData = rawData.pagination || {};
      const totalPages = paginationData.total_pages || paginationData.totalPages || 0;
      
      return {
        data: ventasEnriquecidas,
        pagination: {
          page: paginationData.page || page,
          limit: paginationData.limit || limit,
          total: paginationData.total || 0,
          totalPages,
        },
      };
    } catch (error: any) {
      // Si la función no existe o hay error SQL, retornar estructura vacía
      console.error('Error al obtener historial de ventas:', error);
      return {
        data: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
  }

  async obtenerAnalisisNumeros(
    usuarioId: number | null = null,
    fechaInicio: string | null = null,
    fechaFin: string | null = null,
    turnoId: number | null = null,
    categoria: string | null = null,
  ) {
    try {
      // Construir condiciones WHERE usando valores directos (sanitizados)
      const condiciones: string[] = [];

      if (usuarioId !== null) {
        condiciones.push(`v.usuario_id = ${usuarioId}`);
      }

      if (fechaInicio) {
        condiciones.push(`v.fecha >= '${fechaInicio}'::date`);
      }

      if (fechaFin) {
        condiciones.push(`v.fecha <= '${fechaFin}'::date`);
      }

      if (turnoId !== null) {
        condiciones.push(`v.turno_id = ${turnoId}`);
      }

      if (categoria) {
        condiciones.push(`t.categoria = '${categoria}'`);
      }

      const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

      // Query para obtener estadísticas por número
      const queryEstadisticas = `
        SELECT 
          dv.numero,
          COUNT(DISTINCT dv.venta_id) as veces_vendido,
          SUM(dv.monto) as total_monto,
          COUNT(DISTINCT v.turno_id) as turnos_diferentes,
          COUNT(DISTINCT v.usuario_id) as usuarios_diferentes,
          jsonb_agg(DISTINCT jsonb_build_object(
            'id', t.id,
            'nombre', t.nombre,
            'categoria', t.categoria
          )) as turnos,
          jsonb_agg(DISTINCT jsonb_build_object(
            'id', u.id,
            'name', u.name,
            'email', u.email
          )) as usuarios,
          jsonb_agg(DISTINCT t.categoria) as categorias
        FROM detalles_venta dv
        INNER JOIN ventas v ON dv.venta_id = v.id
        INNER JOIN turnos t ON v.turno_id = t.id
        INNER JOIN users u ON v.usuario_id = u.id
        ${whereClause}
        GROUP BY dv.numero
        ORDER BY dv.numero ASC
      `;

      const estadisticas = await this.prisma.$queryRawUnsafe<any[]>(queryEstadisticas);

      // Obtener todos los números (0-99) y crear el mapa completo
      const todosLosNumeros = Array.from({ length: 100 }, (_, i) => i);
      const estadisticasMap = new Map(
        estadisticas.map((stat: any) => [stat.numero, stat])
      );

      // Crear array completo con todos los números
      const numerosCompletos = todosLosNumeros.map((numero) => {
        const estadistica = estadisticasMap.get(numero);
        return {
          numero,
          vecesVendido: estadistica ? parseInt(estadistica.veces_vendido) : 0,
          totalMonto: estadistica ? parseFloat(estadistica.total_monto) : 0,
          turnosDiferentes: estadistica ? parseInt(estadistica.turnos_diferentes) : 0,
          usuariosDiferentes: estadistica ? parseInt(estadistica.usuarios_diferentes) : 0,
          turnos: estadistica?.turnos || [],
          usuarios: estadistica?.usuarios || [],
          categorias: estadistica?.categorias || [],
          vendido: estadistica ? true : false,
        };
      });

      // Obtener estadísticas por turno si se especificó un turno
      let estadisticasTurno: any = null;
      if (turnoId !== null) {
        const fechaFilters: string[] = [];
        if (fechaInicio) {
          fechaFilters.push(`v.fecha >= '${fechaInicio}'::date`);
        }
        if (fechaFin) {
          fechaFilters.push(`v.fecha <= '${fechaFin}'::date`);
        }
        const fechaWhere = fechaFilters.length > 0 ? `AND ${fechaFilters.join(' AND ')}` : '';
        
        const queryTurno = `
          SELECT 
            t.id,
            t.nombre,
            t.categoria,
            COUNT(DISTINCT v.id) as total_ventas,
            COALESCE(SUM(v.total), 0) as total_monto_turno,
            COUNT(DISTINCT dv.numero) as numeros_vendidos,
            COALESCE(jsonb_agg(DISTINCT dv.numero ORDER BY dv.numero) FILTER (WHERE dv.numero IS NOT NULL), '[]'::jsonb) as numeros_vendidos_lista
          FROM turnos t
          LEFT JOIN ventas v ON v.turno_id = t.id ${fechaWhere}
          LEFT JOIN detalles_venta dv ON dv.venta_id = v.id
          WHERE t.id = ${turnoId}
          GROUP BY t.id, t.nombre, t.categoria
        `;

        const turnoStats = await this.prisma.$queryRawUnsafe<any[]>(queryTurno);

        if (turnoStats.length > 0) {
          const turno = turnoStats[0];
          const numerosVendidos = turno.numeros_vendidos_lista || [];
          const numerosNoVendidos = todosLosNumeros.filter(
            (n) => !numerosVendidos.includes(n)
          );

          estadisticasTurno = {
            turno: {
              id: turno.id,
              nombre: turno.nombre,
              categoria: turno.categoria,
            },
            totalVentas: parseInt(turno.total_ventas || 0),
            totalMonto: parseFloat(turno.total_monto_turno || 0),
            numerosVendidos: numerosVendidos.length,
            numerosNoVendidos: numerosNoVendidos.length,
            numerosVendidosLista: numerosVendidos,
            numerosNoVendidosLista: numerosNoVendidos,
          };
        }
      }

      return {
        numeros: numerosCompletos,
        estadisticasTurno,
        totalNumeros: 100,
        numerosVendidos: estadisticas.length,
        numerosNoVendidos: 100 - estadisticas.length,
      };
    } catch (error: any) {
      console.error('Error al obtener análisis de números:', error);
      return {
        numeros: Array.from({ length: 100 }, (_, i) => ({
          numero: i,
          vecesVendido: 0,
          totalMonto: 0,
          turnosDiferentes: 0,
          usuariosDiferentes: 0,
          turnos: [],
          usuarios: [],
          categorias: [],
          vendido: false,
        })),
        estadisticasTurno: null,
        totalNumeros: 100,
        numerosVendidos: 0,
        numerosNoVendidos: 100,
      };
    }
  }

  async obtenerReporteCierre(
    usuarioId: number | null = null,
    fechaInicio: string | null = null,
    fechaFin: string | null = null,
    turnoId: number | null = null,
  ) {
    try {
      // Si no hay turnoId, retornar estructura vacía
      if (!turnoId) {
        return {
          data: [],
          turno: null,
          fecha: null,
          totalMonto: 0,
        };
      }

      // Si no hay fecha, usar la fecha de hoy en zona horaria de Nicaragua
      const fecha = fechaInicio || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Managua' });
      
      // Si fechaFin es igual a fechaInicio o no se proporciona, usar la misma fecha
      const fechaFinal = fechaFin || fecha;

      // Construir condiciones WHERE usando CAST para asegurar comparación correcta
      const condiciones: string[] = [];
      condiciones.push(`v.turno_id = ${turnoId}`);
      
      // Usar rango de fechas para mayor flexibilidad
      if (fecha === fechaFinal) {
        // Si es la misma fecha, usar comparación exacta con CAST
        condiciones.push(`CAST(v.fecha AS DATE) = CAST('${fecha}' AS DATE)`);
      } else {
        // Si hay rango, usar BETWEEN
        condiciones.push(`CAST(v.fecha AS DATE) BETWEEN CAST('${fecha}' AS DATE) AND CAST('${fechaFinal}' AS DATE)`);
      }

      if (usuarioId !== null) {
        condiciones.push(`v.usuario_id = ${usuarioId}`);
      }

      const whereClause = condiciones.join(' AND ');

      // Query para agrupar ventas por número y sumar montos
      const query = `
        WITH numeros_completos AS (
          SELECT generate_series(0, 99) as numero
        ),
        ventas_agrupadas AS (
          SELECT 
            dv.numero,
            COALESCE(SUM(dv.monto), 0) as total_monto
          FROM detalles_venta dv
          INNER JOIN ventas v ON dv.venta_id = v.id
          WHERE ${whereClause}
          GROUP BY dv.numero
        )
        SELECT 
          nc.numero,
          COALESCE(va.total_monto, 0) as total_monto,
          CASE WHEN va.total_monto IS NOT NULL AND va.total_monto > 0 THEN true ELSE false END as vendido
        FROM numeros_completos nc
        LEFT JOIN ventas_agrupadas va ON nc.numero = va.numero
        ORDER BY nc.numero ASC
      `;

      const result = await this.prisma.$queryRawUnsafe<any[]>(query);

      // Obtener información del turno
      const turno = await this.prisma.turno.findUnique({
        where: { id: turnoId },
        select: {
          id: true,
          nombre: true,
          categoria: true,
          hora: true,
          horaCierre: true,
        },
      });

      // Calcular total monto
      const totalMonto = result.reduce((sum, item) => sum + parseFloat(item.total_monto || 0), 0);

      return {
        data: result.map((item) => ({
          numero: parseInt(item.numero),
          totalMonto: parseFloat(item.total_monto || 0),
          vendido: item.vendido === true,
        })),
        turno: turno,
        fecha: fecha,
        totalMonto: totalMonto,
      };
    } catch (error: any) {
      console.error('Error al obtener reporte de cierre:', error);
      console.error('Error stack:', error.stack);
      return {
        data: Array.from({ length: 100 }, (_, i) => ({
          numero: i,
          totalMonto: 0,
          vendido: false,
        })),
        turno: null,
        fecha: null,
        totalMonto: 0,
      };
    }
  }
}

