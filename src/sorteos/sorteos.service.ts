import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSorteoDto } from './dto/create-sorteo.dto';

@Injectable()
export class SorteosService {
  constructor(private prisma: PrismaService) {}

  async create(createSorteoDto: CreateSorteoDto, realizadoPor: number) {
    const { turnoId, fecha, numeroGanador, montoPremio, descripcion } = createSorteoDto;

    // Verificar si ya existe un sorteo para este turno y fecha
    const existente = await this.prisma.sorteo.findUnique({
      where: {
        turnoId_fecha: {
          turnoId,
          fecha: new Date(fecha),
        },
      },
    });

    if (existente) {
      throw new BadRequestException('Ya existe un sorteo para este turno y fecha');
    }

    return this.prisma.sorteo.create({
      data: {
        turnoId,
        fecha: new Date(fecha),
        numeroGanador,
        montoPremio: montoPremio ? montoPremio : null,
        descripcion,
        realizadoPor,
      },
    });
  }

  async findAll(fecha?: string) {
    const where: any = {};

    if (fecha) {
      where.fecha = new Date(fecha);
    }

    return this.prisma.sorteo.findMany({
      where,
      include: {
        turno: {
          select: {
            id: true,
            nombre: true,
          },
        },
        realizadoPorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ fecha: 'desc' }, { realizadoEn: 'desc' }],
    });
  }

  async findOne(id: number) {
    const sorteo = await this.prisma.sorteo.findUnique({
      where: { id },
      include: {
        turno: true,
        realizadoPorUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!sorteo) {
      throw new NotFoundException(`Sorteo con ID ${id} no encontrado`);
    }

    return sorteo;
  }
}

