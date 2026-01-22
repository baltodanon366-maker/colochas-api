import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConfiguracionDto } from './dto/create-configuracion.dto';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';

@Injectable()
export class ConfiguracionesService {
  constructor(private prisma: PrismaService) {}

  async create(createConfiguracionDto: CreateConfiguracionDto, updatedBy: number) {
    return this.prisma.configuracion.create({
      data: {
        ...createConfiguracionDto,
        estado: 'activo',
        tipo: createConfiguracionDto.tipo || 'string',
        updatedBy,
      },
    });
  }

  async findAll() {
    return this.prisma.configuracion.findMany({
      where: { estado: 'activo' },
      orderBy: { clave: 'asc' },
    });
  }

  async findOne(id: number) {
    const configuracion = await this.prisma.configuracion.findUnique({
      where: { id },
    });

    if (!configuracion) {
      throw new NotFoundException(`Configuración con ID ${id} no encontrada`);
    }

    return configuracion;
  }

  async findByClave(clave: string) {
    const configuracion = await this.prisma.configuracion.findUnique({
      where: { clave },
    });

    if (!configuracion) {
      throw new NotFoundException(`Configuración con clave "${clave}" no encontrada`);
    }

    return configuracion;
  }

  async update(id: number, updateConfiguracionDto: UpdateConfiguracionDto, updatedBy: number) {
    const configuracion = await this.prisma.configuracion.findUnique({
      where: { id },
    });

    if (!configuracion) {
      throw new NotFoundException(`Configuración con ID ${id} no encontrada`);
    }

    return this.prisma.configuracion.update({
      where: { id },
      data: {
        ...updateConfiguracionDto,
        updatedBy,
      },
    });
  }

  async remove(id: number) {
    const configuracion = await this.prisma.configuracion.findUnique({
      where: { id },
    });

    if (!configuracion) {
      throw new NotFoundException(`Configuración con ID ${id} no encontrada`);
    }

    // Desactivar en lugar de eliminar
    return this.prisma.configuracion.update({
      where: { id },
      data: { estado: 'inactivo' },
    });
  }
}

