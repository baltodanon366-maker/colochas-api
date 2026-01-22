import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermisosService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permiso.findMany({
      where: { estado: 'activo' },
      orderBy: [{ modulo: 'asc' }, { nombre: 'asc' }],
    });
  }

  async findOne(id: number) {
    const permiso = await this.prisma.permiso.findUnique({
      where: { id },
    });

    if (!permiso) {
      throw new NotFoundException(`Permiso con ID ${id} no encontrado`);
    }

    return permiso;
  }

  async findByModulo(modulo: string) {
    return this.prisma.permiso.findMany({
      where: {
        modulo,
        estado: 'activo',
      },
      orderBy: { nombre: 'asc' },
    });
  }
}

