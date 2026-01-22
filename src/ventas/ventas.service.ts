import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVentaDto } from './dto/create-venta.dto';

@Injectable()
export class VentasService {
  constructor(private prisma: PrismaService) {}

  async create(createVentaDto: CreateVentaDto, usuarioId: number) {
    const { turnoId, fecha, detalles, observaciones } = createVentaDto;

    // Convertir detalles a JSONB
    const detallesJson = JSON.stringify(detalles);

    // Llamar al stored procedure usando $queryRaw con template literals
    // Siempre pasar el 5to parámetro, usando null cuando observaciones es null
    // PostgreSQL reconocerá el tipo y usará el DEFAULT si es necesario
    let result: Array<{ resultado: any }>;
    try {
      // Siempre pasar los 5 parámetros, usando null cuando observaciones es null
      // Prisma manejará el null correctamente con el cast ::text
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
      // Si la función no existe, proporcionar un mensaje de error más claro
      if (error.message && error.message.includes('no existe la función')) {
        throw new BadRequestException(
          'La función crear_venta no existe en la base de datos. Por favor, ejecute el script database/ensure_crear_venta_function.sql o database/stored_procedures.sql para crear las funciones necesarias.',
        );
      }
      throw error;
    }

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new BadRequestException(
        data?.errores || data?.error || 'Error al crear venta',
      );
    }

    // Obtener la venta completa con detalles
    const venta = await this.prisma.venta.findUnique({
      where: { id: data.venta_id },
      include: {
        turno: true,
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        detallesVenta: true,
      },
    });

    return venta;
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
            email: true,
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
}

