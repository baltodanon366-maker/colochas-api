import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarcarAlertaDto } from './dto/marcar-alerta.dto';

@Injectable()
export class AlertasService {
  constructor(private prisma: PrismaService) {}

  async findAll(usuarioId: number, estado?: string) {
    const where: any = { usuarioId };

    if (estado) {
      where.estado = estado;
    }

    return this.prisma.alerta.findMany({
      where,
      include: {
        turno: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number, usuarioId: number) {
    const alerta = await this.prisma.alerta.findFirst({
      where: {
        id,
        usuarioId, // Solo puede ver sus propias alertas
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

    if (!alerta) {
      throw new NotFoundException(`Alerta con ID ${id} no encontrada`);
    }

    return alerta;
  }

  async marcarAlerta(id: number, usuarioId: number, marcarAlertaDto: MarcarAlertaDto) {
    const alerta = await this.prisma.alerta.findFirst({
      where: {
        id,
        usuarioId, // Solo puede marcar sus propias alertas
      },
    });

    if (!alerta) {
      throw new NotFoundException(`Alerta con ID ${id} no encontrada`);
    }

    const updateData: any = {};

    if (marcarAlertaDto.accion === 'vista') {
      updateData.estado = 'vista';
      updateData.vistaEn = new Date();
    } else if (marcarAlertaDto.accion === 'resuelta') {
      updateData.estado = 'resuelta';
      updateData.resueltaEn = new Date();
    }

    return this.prisma.alerta.update({
      where: { id },
      data: updateData,
    });
  }

  async obtenerAlertasActivas(usuarioId: number) {
    return this.prisma.alerta.findMany({
      where: {
        usuarioId,
        estado: 'activa',
      },
      include: {
        turno: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

