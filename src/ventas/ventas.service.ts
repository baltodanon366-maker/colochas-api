import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  async create(createVentaDto: CreateVentaDto, usuarioId: number) {
    const { turnoId, fecha, detalles, observaciones } = createVentaDto;

    if (usuarioId == null || usuarioId === undefined) {
      throw new BadRequestException('Usuario no identificado. Vuelve a iniciar sesión.');
    }

    // Convertir detalles a JSONB
    const detallesJson = JSON.stringify(detalles);

    let result: Array<{ resultado: any }>;
    try {
      result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
        SELECT crear_venta(
          ${turnoId}::integer,
          ${usuarioId}::integer,
          ${fecha}::date,
          ${detallesJson}::jsonb,
          ${observaciones || null}::text
        ) as resultado
      `;
    } catch (error: any) {
      if (error.message && error.message.includes('no existe la función')) {
        throw new BadRequestException(
          'La función crear_venta no existe en la base de datos. Ejecute database/ensure_crear_venta_function.sql o stored_procedures.sql.',
        );
      }
      console.error('[VentasService.create] Error al llamar crear_venta:', error?.message || error);
      throw new BadRequestException(
        error?.message || 'Error al crear la venta. Revisa que el turno esté activo y la fecha sea correcta.',
      );
    }

    let data: any = result[0]?.resultado;
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        data = null;
      }
    }
    if (!data) {
      throw new BadRequestException('La base de datos no devolvió resultado al crear la venta.');
    }
    if (data.exito === false || !data.exito) {
      const mensaje = Array.isArray(data.errores)
        ? data.errores.join(' ')
        : data.error || data.errores || 'Error al crear venta';
      throw new BadRequestException(mensaje);
    }

    const ventaId = data.venta_id ?? data.ventaId;
    if (ventaId == null) {
      throw new BadRequestException('No se obtuvo el ID de la venta creada.');
    }

    try {
      const venta = await this.prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          turno: true,
          usuario: {
            select: {
              id: true,
              name: true,
              telefono: true,
            },
          },
          detallesVenta: true,
        },
      });
      if (!venta) {
        throw new BadRequestException('Venta creada pero no se pudo recuperar. ID: ' + ventaId);
      }
      return venta;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      console.error('[VentasService.create] Error al obtener venta:', err?.message || err);
      throw new BadRequestException(
        err?.message || 'Venta creada pero falló al obtener el detalle. Recarga el historial.',
      );
    }
  }

  // Métodos eliminados por redundancia:
  // - findAll() → Usar HistorialService.obtenerHistorialVentas()
  // - findByUsuario() → Usar HistorialService.obtenerHistorialVentas() con usuarioId

  async findOne(id: number) {
    const venta = await this.prisma.venta.findUnique({
      where: { id },
      include: {
        turno: true,
        usuario: {
          select: {
            id: true,
            name: true,
            telefono: true,
          },
        },
        detallesVenta: true,
      },
    });

    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }

    return venta;
  }

  async buscarBoucher(numeroBoucher: string) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT buscar_boucher(${numeroBoucher}) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new NotFoundException(data?.error || 'Boucher no encontrado');
    }

    return data.data;
  }

  /** Hard delete: elimina la venta y sus detalles (cascade en BD). */
  async delete(id: number): Promise<void> {
    const venta = await this.prisma.venta.findUnique({ where: { id } });
    if (!venta) {
      throw new NotFoundException(`Venta con ID ${id} no encontrada`);
    }
    await this.prisma.venta.delete({ where: { id } });
  }
}

