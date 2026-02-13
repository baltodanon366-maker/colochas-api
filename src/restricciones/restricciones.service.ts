import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRestriccionDto } from './dto/create-restriccion.dto';
import { CreateMultipleRestriccionesDto } from './dto/create-multiple-restricciones.dto';
import { UpdateRestriccionDto } from './dto/update-restriccion.dto';

@Injectable()
export class RestriccionesService {
  constructor(private prisma: PrismaService) {}

  async create(createRestriccionDto: CreateRestriccionDto) {
    const { 
      turnoId, 
      numero, 
      fecha, 
      tipoRestriccion = 'completo',
      limiteMonto,
      limiteCantidad 
    } = createRestriccionDto;

    // Validar rango de número
    if (numero < 0 || numero > 99) {
      throw new BadRequestException('El número debe estar entre 0 y 99');
    }

    // Validar tipo de restricción
    if (!['completo', 'monto', 'cantidad'].includes(tipoRestriccion)) {
      throw new BadRequestException('Tipo de restricción inválido. Debe ser: completo, monto o cantidad');
    }

    // Validar límites según el tipo
    if (tipoRestriccion === 'monto' && (!limiteMonto || limiteMonto <= 0)) {
      throw new BadRequestException('Para restricción de tipo "monto", debe especificar un límite de monto mayor a 0');
    }

    if (tipoRestriccion === 'cantidad' && (!limiteCantidad || limiteCantidad <= 0)) {
      throw new BadRequestException('Para restricción de tipo "cantidad", debe especificar un límite de cantidad mayor a 0');
    }

    // Validar que el turno existe y está activo
    const turnoValidacion = await this.prisma.turno.findFirst({
      where: { id: turnoId, estado: 'activo' },
    });

    if (!turnoValidacion) {
      throw new NotFoundException('Turno no encontrado o inactivo');
    }

    // Validar formato de fecha
    const fechaDate = new Date(fecha);
    if (isNaN(fechaDate.getTime())) {
      throw new BadRequestException('Fecha inválida. Use formato YYYY-MM-DD');
    }

    // Verificar si ya existe
    const existentes = await this.prisma.$queryRaw<any[]>`
      SELECT id, turno_id as "turnoId", numero, fecha, esta_restringido as "estaRestringido",
             tipo_restriccion as "tipoRestriccion", limite_monto as "limiteMonto", limite_cantidad as "limiteCantidad"
      FROM restricciones_numeros 
      WHERE turno_id = ${turnoId} 
      AND numero = ${numero} 
      AND fecha = ${fechaDate}::date
    `;
    const existente = existentes.length > 0 ? existentes[0] : null;

    if (existente) {
      // Si ya existe, retornar el existente (ya está restringido)
      return {
        message: 'El número ya está restringido',
        restriccion: existente,
      };
    }

    // Crear nueva restricción con los nuevos campos
    const resultado = await this.prisma.$queryRaw<any[]>`
      INSERT INTO restricciones_numeros (
        turno_id, numero, fecha, esta_restringido, 
        tipo_restriccion, limite_monto, limite_cantidad,
        created_at, updated_at
      )
      VALUES (
        ${turnoId}, ${numero}, ${fechaDate}::date, true,
        ${tipoRestriccion}::VARCHAR,
        ${limiteMonto ?? null}::DECIMAL,
        ${limiteCantidad ?? null}::INTEGER,
        NOW(), NOW()
      )
      RETURNING 
        id, turno_id as "turnoId", numero, fecha, 
        esta_restringido as "estaRestringido",
        tipo_restriccion as "tipoRestriccion",
        limite_monto as "limiteMonto",
        limite_cantidad as "limiteCantidad",
        created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    if (!resultado || resultado.length === 0) {
      throw new BadRequestException('Error al crear restricción');
    }
    
    const restriccion = resultado[0];
    
    // Obtener información del turno
    const turno = await this.prisma.turno.findUnique({
      where: { id: turnoId },
      select: { id: true, nombre: true },
    });
    
    return {
      message: `Número ${numero} restringido exitosamente`,
      restriccion: {
        ...restriccion,
        turno: turno || null,
      },
    };
  }

  async createMultiple(createMultipleDto: CreateMultipleRestriccionesDto) {
    try {
      const { 
        turnoId, 
        numeros, 
        numerosConRestricciones,
        fecha,
        tipoRestriccion: tipoGlobal = 'completo',
        limiteMonto: limiteMontoGlobal,
        limiteCantidad: limiteCantidadGlobal
      } = createMultipleDto;
      
      // Determinar qué modo usar: simple (numeros) o avanzado (numerosConRestricciones)
      let numerosAProcesar: Array<{ numero: number; tipoRestriccion: string; limiteMonto?: number; limiteCantidad?: number }> = [];

      if (numerosConRestricciones && numerosConRestricciones.length > 0) {
        // Modo avanzado: usar numerosConRestricciones
        numerosAProcesar = numerosConRestricciones.map(nr => ({
          numero: nr.numero,
          tipoRestriccion: nr.tipoRestriccion || tipoGlobal,
          limiteMonto: nr.limiteMonto,
          limiteCantidad: nr.limiteCantidad,
        }));
      } else if (numeros && numeros.length > 0) {
        // Modo simple: usar numeros con tipo y límites globales
        numerosAProcesar = numeros.map(n => ({
          numero: n,
          tipoRestriccion: tipoGlobal,
          limiteMonto: limiteMontoGlobal,
          limiteCantidad: limiteCantidadGlobal,
        }));
      } else {
        throw new BadRequestException('Debe incluir al menos un número (numeros o numerosConRestricciones)');
      }

      // Validar rango de números (0-99)
      const numerosInvalidos = numerosAProcesar.filter((n) => n.numero < 0 || n.numero > 99);
      if (numerosInvalidos.length > 0) {
        throw new BadRequestException(
          `Números inválidos. Deben ser números enteros entre 0 y 99`,
        );
      }

      // Validar que los números sean únicos
      const numerosUnicos = new Map<number, typeof numerosAProcesar[0]>();
      for (const item of numerosAProcesar) {
        if (!numerosUnicos.has(item.numero)) {
          numerosUnicos.set(item.numero, item);
        }
      }

      // Validar tipos y límites
      for (const item of numerosUnicos.values()) {
        if (!['completo', 'monto', 'cantidad'].includes(item.tipoRestriccion)) {
          throw new BadRequestException(`Tipo de restricción inválido para número ${item.numero}`);
        }
        if (item.tipoRestriccion === 'monto' && (!item.limiteMonto || item.limiteMonto <= 0)) {
          throw new BadRequestException(`Para número ${item.numero}, debe especificar un límite de monto mayor a 0`);
        }
        if (item.tipoRestriccion === 'cantidad' && (!item.limiteCantidad || item.limiteCantidad <= 0)) {
          throw new BadRequestException(`Para número ${item.numero}, debe especificar un límite de cantidad mayor a 0`);
        }
      }

      // Validar que el turno existe y está activo
      const turno = await this.prisma.turno.findFirst({
        where: { id: turnoId, estado: 'activo' },
      });

      if (!turno) {
        throw new NotFoundException('Turno no encontrado o inactivo');
      }

      // Validar formato de fecha
      const fechaDate = new Date(fecha);
      if (isNaN(fechaDate.getTime())) {
        throw new BadRequestException('Fecha inválida. Use formato YYYY-MM-DD');
      }

      const restriccionesCreadas: any[] = [];
      const restriccionesExistentes: any[] = [];

      // Crear restricciones para cada número
      for (const item of numerosUnicos.values()) {
        try {
          // Verificar si ya existe
          const existentes = await this.prisma.$queryRaw<any[]>`
            SELECT id, turno_id as "turnoId", numero, fecha, esta_restringido as "estaRestringido",
                   tipo_restriccion as "tipoRestriccion", limite_monto as "limiteMonto", limite_cantidad as "limiteCantidad"
            FROM restricciones_numeros 
            WHERE turno_id = ${turnoId} 
            AND numero = ${item.numero} 
            AND fecha = ${fechaDate}::date
          `;

          if (existentes.length === 0) {
            // Crear nueva restricción con los nuevos campos
            const resultado = await this.prisma.$queryRaw<any[]>`
              INSERT INTO restricciones_numeros (
                turno_id, numero, fecha, esta_restringido,
                tipo_restriccion, limite_monto, limite_cantidad,
                created_at, updated_at
              )
              VALUES (
                ${turnoId}, ${item.numero}, ${fechaDate}::date, true,
                ${item.tipoRestriccion}::VARCHAR,
                ${item.limiteMonto ?? null}::DECIMAL,
                ${item.limiteCantidad ?? null}::INTEGER,
                NOW(), NOW()
              )
              RETURNING 
                id, turno_id as "turnoId", numero, fecha, 
                esta_restringido as "estaRestringido",
                tipo_restriccion as "tipoRestriccion",
                limite_monto as "limiteMonto",
                limite_cantidad as "limiteCantidad",
                created_at as "createdAt", updated_at as "updatedAt"
            `;
            if (resultado && resultado.length > 0) {
              restriccionesCreadas.push(resultado[0]);
            }
          } else {
            // Si ya existe, agregarlo a la lista de existentes
            restriccionesExistentes.push(existentes[0]);
          }
        } catch (error: any) {
          // Si hay un error al crear una restricción específica, continuar con las demás
          console.error(`Error al crear restricción para número ${item.numero}:`, error);
          // No lanzar error aquí, solo registrar
        }
      }

      return {
        message: `${restriccionesCreadas.length} número(s) restringido(s) exitosamente`,
        restricciones: restriccionesCreadas,
        restriccionesExistentes: restriccionesExistentes,
        totalCreadas: restriccionesCreadas.length,
        totalExistentes: restriccionesExistentes.length,
        total: restriccionesCreadas.length + restriccionesExistentes.length,
      };
    } catch (error: any) {
      // Si es una excepción de NestJS (BadRequestException, NotFoundException), relanzarla
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      // Para otros errores, registrar y lanzar un error genérico
      console.error('Error en createMultiple:', error);
      throw new BadRequestException(
        error.message || 'Error al crear restricciones. Verifique los datos enviados.',
      );
    }
  }

  async findAll(turnoId?: number, fecha?: string) {
    try {
      const where: any = {};

      if (turnoId) {
        where.turnoId = turnoId;
      }

      if (fecha) {
        where.fecha = new Date(fecha);
      }

      // Usar SQL directo para evitar problemas con cliente Prisma desactualizado
      // Seleccionar todas las columnas incluyendo los nuevos campos
      let restricciones: any[];
      
      const selectColumns = `
        id, turno_id as "turnoId", numero, fecha, 
        esta_restringido as "estaRestringido",
        tipo_restriccion as "tipoRestriccion",
        limite_monto as "limiteMonto",
        limite_cantidad as "limiteCantidad",
        created_at as "createdAt", updated_at as "updatedAt"
      `;
      
      if (turnoId && fecha) {
        const fechaDate = new Date(fecha);
        restricciones = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT ${selectColumns} FROM restricciones_numeros 
           WHERE turno_id = $1 AND fecha = $2::date
           ORDER BY fecha DESC, numero ASC`,
          turnoId,
          fechaDate
        );
      } else if (turnoId) {
        restricciones = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT ${selectColumns} FROM restricciones_numeros 
           WHERE turno_id = $1
           ORDER BY fecha DESC, numero ASC`,
          turnoId
        );
      } else if (fecha) {
        const fechaDate = new Date(fecha);
        restricciones = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT ${selectColumns} FROM restricciones_numeros 
           WHERE fecha = $1::date
           ORDER BY fecha DESC, numero ASC`,
          fechaDate
        );
      } else {
        restricciones = await this.prisma.$queryRawUnsafe<any[]>(
          `SELECT ${selectColumns} FROM restricciones_numeros 
           ORDER BY fecha DESC, numero ASC`
        );
      }

      // Cargar turnos por separado para evitar problemas con include
      const turnoIds = [...new Set(restricciones.map((r) => r.turno_id || r.turnoId))];
      const turnos = await this.prisma.turno.findMany({
        where: { id: { in: turnoIds } },
        select: { id: true, nombre: true },
      });

      // Mapear turnos a restricciones (sin limite_ventas, columna eliminada)
      return restricciones.map((restriccion) => ({
        id: restriccion.id,
        turnoId: restriccion.turno_id || restriccion.turnoId,
        numero: restriccion.numero,
        fecha: restriccion.fecha,
        estaRestringido: restriccion.esta_restringido || restriccion.estaRestringido || true,
        tipoRestriccion: restriccion.tipoRestriccion || restriccion.tipo_restriccion,
        limiteMonto: restriccion.limiteMonto ?? restriccion.limite_monto,
        limiteCantidad: restriccion.limiteCantidad ?? restriccion.limite_cantidad,
        createdAt: restriccion.created_at || restriccion.createdAt,
        updatedAt: restriccion.updated_at || restriccion.updatedAt,
        turno: turnos.find((t) => t.id === (restriccion.turno_id || restriccion.turnoId)) || null,
      }));
    } catch (error: any) {
      console.error('Error en findAll restricciones:', error);
      console.error('Stack trace:', error.stack);
      // Si hay error, retornar array vacío en lugar de fallar
      return [];
    }
  }

  async findOne(id: number) {
    const restriccion = await this.prisma.restriccionNumero.findUnique({
      where: { id },
      include: {
        turno: true,
      },
    });

    if (!restriccion) {
      throw new NotFoundException(`Restricción con ID ${id} no encontrada`);
    }

    return restriccion;
  }

  async update(id: number, updateRestriccionDto: UpdateRestriccionDto) {
    const restriccion = await this.prisma.restriccionNumero.findUnique({
      where: { id },
    });

    if (!restriccion) {
      throw new NotFoundException(`Restricción con ID ${id} no encontrada`);
    }

    // Con el nuevo esquema simplificado, las restricciones solo se crean o eliminan
    // No hay campos actualizables. Si se necesita "actualizar", se elimina y se crea de nuevo.
    // Retornamos la restricción actual sin cambios.
    return restriccion;
  }

  async remove(id: number) {
    const restriccion = await this.prisma.restriccionNumero.findUnique({
      where: { id },
    });

    if (!restriccion) {
      throw new NotFoundException(`Restricción con ID ${id} no encontrada`);
    }

    await this.prisma.restriccionNumero.delete({
      where: { id },
    });

    return {
      message: 'Restricción eliminada exitosamente',
      numero: restriccion.numero,
    };
  }

  async removeByNumero(turnoId: number, numero: number, fecha: string) {
    const restriccion = await this.prisma.restriccionNumero.findUnique({
      where: {
        turnoId_numero_fecha: {
          turnoId,
          numero,
          fecha: new Date(fecha),
        },
      },
    });

    if (!restriccion) {
      throw new NotFoundException('Restricción no encontrada');
    }

    await this.prisma.restriccionNumero.delete({
      where: { id: restriccion.id },
    });

    return {
      message: `Número ${numero} desrestringido exitosamente`,
      numero: restriccion.numero,
    };
  }

  async removeMultiple(turnoId: number, numeros: number[], fecha: string) {
    // Validar que el array no esté vacío
    if (!numeros || numeros.length === 0) {
      throw new BadRequestException('Debe incluir al menos un número');
    }

    // Validar formato de fecha
    const fechaDate = new Date(fecha);
    if (isNaN(fechaDate.getTime())) {
      throw new BadRequestException('Fecha inválida. Use formato YYYY-MM-DD');
    }

    const eliminadas: number[] = [];
    const noEncontradas: number[] = [];

    for (const numero of numeros) {
      const restriccion = await this.prisma.restriccionNumero.findUnique({
        where: {
          turnoId_numero_fecha: {
            turnoId,
            numero,
            fecha: fechaDate,
          },
        },
      });

      if (restriccion) {
        await this.prisma.restriccionNumero.delete({
          where: { id: restriccion.id },
        });
        eliminadas.push(numero);
      } else {
        noEncontradas.push(numero);
      }
    }

    return {
      message: `${eliminadas.length} número(s) desrestringido(s) exitosamente`,
      numerosEliminados: eliminadas,
      numerosNoEncontrados: noEncontradas,
      totalEliminados: eliminadas.length,
      totalNoEncontrados: noEncontradas.length,
    };
  }

  async verificarRestriccion(turnoId: number, numero: number, fecha: string) {
    // Validar formato de fecha
    const fechaDate = new Date(fecha);
    if (isNaN(fechaDate.getTime())) {
      throw new BadRequestException('Fecha inválida. Use formato YYYY-MM-DD');
    }

    const restriccion = await this.prisma.restriccionNumero.findUnique({
      where: {
        turnoId_numero_fecha: {
          turnoId,
          numero,
          fecha: fechaDate,
        },
      },
      include: {
        turno: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    return {
      estaRestringido: restriccion !== null,
      numero,
      turnoId,
      turnoNombre: restriccion?.turno?.nombre || null,
      fecha,
      mensaje: restriccion
        ? `El número ${numero} está restringido para el turno ${restriccion.turno.nombre}`
        : `El número ${numero} está disponible para venta`,
    };
  }

  async verificarMultiples(turnoId: number, numeros: number[], fecha: string) {
    // Validar que el array no esté vacío
    if (!numeros || numeros.length === 0) {
      throw new BadRequestException('Debe incluir al menos un número');
    }

    // Validar formato de fecha
    const fechaDate = new Date(fecha);
    if (isNaN(fechaDate.getTime())) {
      throw new BadRequestException('Fecha inválida. Use formato YYYY-MM-DD');
    }

    const resultados: Array<{ numero: number; estaRestringido: boolean }> = [];

    for (const numero of numeros) {
      const restriccion = await this.prisma.restriccionNumero.findUnique({
        where: {
          turnoId_numero_fecha: {
            turnoId,
            numero,
            fecha: fechaDate,
          },
        },
      });

      resultados.push({
        numero,
        estaRestringido: restriccion !== null,
      });
    }

    const restringidos = resultados.filter((r) => r.estaRestringido);
    const disponibles = resultados.filter((r) => !r.estaRestringido);

    return {
      resultados,
      total: resultados.length,
      restringidos: restringidos.length,
      disponibles: disponibles.length,
      numerosRestringidos: restringidos.map((r) => r.numero),
      numerosDisponibles: disponibles.map((r) => r.numero),
    };
  }
}

