import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';

@Injectable()
export class TurnosService {
  constructor(private prisma: PrismaService) {}

  async create(createTurnoDto: CreateTurnoDto, createdById: number) {
    return this.prisma.turno.create({
      data: {
        ...createTurnoDto,
        estado: 'activo',
        createdById,
        tiempoAlerta: createTurnoDto.tiempoAlerta || 10,
        tiempoBloqueo: createTurnoDto.tiempoBloqueo || 5,
      },
    });
  }

  async findAll(categoria?: 'diaria' | 'tica', includeInactivos: boolean = false) {
    const where: any = {};
    
    if (!includeInactivos) {
      where.estado = 'activo';
    }
    
    if (categoria) {
      where.categoria = categoria;
    }
    
    return this.prisma.turno.findMany({
      where,
      orderBy: [
        { categoria: 'asc' },
        { hora: 'asc' },
        { nombre: 'asc' },
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: number) {
    const turno = await this.prisma.turno.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!turno) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }

    return turno;
  }

  async update(id: number, updateTurnoDto: UpdateTurnoDto) {
    const turno = await this.prisma.turno.findUnique({
      where: { id },
    });

    if (!turno) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }

    return this.prisma.turno.update({
      where: { id },
      data: updateTurnoDto,
    });
  }

  async remove(id: number) {
    const turno = await this.prisma.turno.findUnique({
      where: { id },
    });

    if (!turno) {
      throw new NotFoundException(`Turno con ID ${id} no encontrado`);
    }

    // Verificar si el turno es uno de los estándar (no se pueden eliminar, solo desactivar)
    const turnosEstandar = ['12 MD', '3 PM', '6 PM', '9 PM', '1 PM', '4:30 PM', '7:30 PM'];
    const esEstandar = turnosEstandar.includes(turno.nombre);

    if (esEstandar) {
      // Los turnos estándar solo se desactivan, no se eliminan
      return this.prisma.turno.update({
        where: { id },
        data: { estado: 'inactivo' },
      });
    } else {
      // Los turnos no estándar se pueden eliminar completamente
      // Primero verificar si tiene ventas o restricciones asociadas
      const ventasCount = await this.prisma.venta.count({
        where: { turnoId: id },
      });

      const restriccionesCount = await this.prisma.restriccionNumero.count({
        where: { turnoId: id },
      });

      if (ventasCount > 0 || restriccionesCount > 0) {
        // Si tiene datos asociados, solo desactivar
        return this.prisma.turno.update({
          where: { id },
          data: { estado: 'inactivo' },
        });
      } else {
        // Si no tiene datos asociados, eliminar completamente
        return this.prisma.turno.delete({
          where: { id },
        });
      }
    }
  }

  async verificarAlertaCierre(turnoId: number) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT verificar_alerta_cierre_turno(${turnoId}) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new NotFoundException(data?.error || 'Error al verificar alerta');
    }

    return data;
  }
}

