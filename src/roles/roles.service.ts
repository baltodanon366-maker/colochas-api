import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto, createdById: number) {
    return this.prisma.role.create({
      data: {
        ...createRoleDto,
        estado: 'activo',
      },
    });
  }

  async findAll() {
    return this.prisma.role.findMany({
      where: { estado: 'activo' },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permisos: {
          include: {
            permiso: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return {
      ...role,
      permisos: role.permisos.map((rp) => ({
        id: rp.permiso.id,
        nombre: rp.permiso.nombre,
        descripcion: rp.permiso.descripcion,
        modulo: rp.permiso.modulo,
      })),
    };
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    return this.prisma.role.update({
      where: { id },
      data: updateRoleDto,
    });
  }

  async remove(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException(`Rol con ID ${id} no encontrado`);
    }

    // Desactivar en lugar de eliminar
    return this.prisma.role.update({
      where: { id },
      data: { estado: 'inactivo' },
    });
  }

  async getPermisos(roleId: number) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT obtener_permisos_rol(${roleId}) as resultado
    `;

    return result[0]?.resultado || [];
  }

  async assignPermiso(roleId: number, permisoId: number, assignedById: number) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT asignar_permiso_rol(${roleId}, ${permisoId}, ${assignedById}) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new BadRequestException(data?.error || 'Error al asignar permiso');
    }

    return {
      message: data.message || 'Permiso asignado exitosamente',
    };
  }

  async removePermiso(roleId: number, permisoId: number, removedById: number) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT remover_permiso_rol(${roleId}, ${permisoId}, ${removedById}) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new BadRequestException(data?.error || 'Error al remover permiso');
    }

    return {
      message: data.message || 'Permiso removido exitosamente',
    };
  }
}

