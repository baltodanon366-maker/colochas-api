import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto, createdById: number) {
    const { name, telefono, roleIds = [] } = createUserDto;

    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT registrar_usuario(
        ${name}::VARCHAR(100),
        ${telefono}::VARCHAR(8),
        ${createdById}::INTEGER,
        ${roleIds}::integer[]
      ) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new BadRequestException(data?.error || 'Error al crear usuario');
    }

    return {
      message: data.message || 'Usuario creado exitosamente',
      usuario_id: data.usuario_id,
    };
  }

  // Método eliminado por redundancia:
  // findAll() → Usar AuthService.getAllUsers() que tiene paginación y filtros avanzados

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return {
      id: user.id,
      name: user.name,
      telefono: user.telefono,
      estado: user.estado,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: user.roles.map((ur) => ({
        id: ur.role.id,
        nombre: ur.role.nombre,
        descripcion: ur.role.descripcion,
      })),
    };
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async activate(id: number, activatedById: number) {
    if (id === activatedById) {
      throw new ForbiddenException('No puedes activar tu propio usuario');
    }

    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT activar_usuario(${id}::INTEGER, ${activatedById}::INTEGER) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new BadRequestException(data?.error || 'Error al activar usuario');
    }

    return {
      message: data.message || 'Usuario activado exitosamente',
    };
  }

  async deactivate(id: number, deactivatedById: number) {
    if (id === deactivatedById) {
      throw new ForbiddenException('No puedes desactivar tu propio usuario');
    }

    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT desactivar_usuario(${id}::INTEGER, ${deactivatedById}::INTEGER) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new BadRequestException(data?.error || 'Error al desactivar usuario');
    }

    return {
      message: data.message || 'Usuario desactivado exitosamente',
    };
  }

  async getRoles(userId: number) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT obtener_roles_usuario(${userId}) as resultado
    `;

    return result[0]?.resultado || [];
  }

  async assignRole(userId: number, roleId: number, assignedById: number) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT asignar_rol_usuario(${userId}::INTEGER, ${roleId}::INTEGER, ${assignedById}::INTEGER) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new BadRequestException(data?.error || 'Error al asignar rol');
    }

    return {
      message: data.message || 'Rol asignado exitosamente',
    };
  }

  async removeRole(userId: number, roleId: number, removedById: number) {
    const result = await this.prisma.$queryRaw<Array<{ resultado: any }>>`
      SELECT remover_rol_usuario(${userId}::INTEGER, ${roleId}::INTEGER, ${removedById}::INTEGER) as resultado
    `;

    const data = result[0]?.resultado;

    if (!data || !data.exito) {
      throw new BadRequestException(data?.error || 'Error al remover rol');
    }

    return {
      message: data.message || 'Rol removido exitosamente',
    };
  }
}

