import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/sign-up.dto';
// DTO eliminado: ConfirmUserDto - No se utiliza más
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateAuthUserDto } from './dto/update-user.dto';
import { GetUsersQueryDto } from './dto/get-users-query.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const { email, password, name, username } = signUpDto;

    // Verificar si el usuario ya existe
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException('El usuario ya existe');
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario (sin roles por defecto, se asignan después)
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        estado: 'inactivo', // Requiere confirmación
      },
    });

    // Generar código de confirmación (en producción, enviar por email)
    // Por ahora, retornamos el usuario creado
    return {
      userId: user.id.toString(),
      email: user.email,
      name: user.name,
      username: username || user.email.split('@')[0],
      createdAt: user.createdAt.toISOString(),
    };
  }

  // Método eliminado: confirmUser
  // No se utiliza más en el sistema

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Buscar usuario
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.estado === 'inactivo') {
      throw new UnauthorizedException('Usuario inactivo. Contacta al administrador.');
    }

    // Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Actualizar last_login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Obtener roles activos
    const roles = user.roles
      .filter((ur) => ur.role.estado === 'activo')
      .map((ur) => ur.role.nombre);

    // Generar JWT token
    const payload = {
      sub: user.id, // Número, no string
      email: user.email,
      roles,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.name,
        roles,
      },
    };
  }

  // Métodos eliminados por redundancia:
  // - getUserRole() → Usar UsersService.getRoles()
  // - addToAdminGroup() → Usar UsersService.assignRole()
  // - removeFromAdminGroup() → Usar UsersService.removeRole()
  // - adminTest() → Endpoint de prueba, eliminado

  async updateUser(id: string, updateUserDto: UpdateAuthUserDto) {
    const userId = parseInt(id);

    if (isNaN(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(updateUserDto.name && { name: updateUserDto.name }),
      },
    });

    return {
      name: updatedUser.name,
      username: updateUserDto.username || updatedUser.email.split('@')[0],
      phoneNumber: updateUserDto.phoneNumber || null,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email } = resetPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Por seguridad, no revelamos si el usuario existe
      return {
        message: 'Si el email existe, se enviará un enlace de restablecimiento',
      };
    }

    // En producción, generar token y enviar email
    // Por ahora, retornamos mensaje genérico
    return {
      message: 'Si el email existe, se enviará un enlace de restablecimiento',
    };
  }

  async getAllUsers(query: GetUsersQueryDto) {
    const {
      page = 1,
      limit = 10,
      offset,
      filterField,
      filterRule,
      filterValue,
      sortField,
      sortBy,
      sortOrder = 'ASC',
    } = query;

    // Construir where clause
    const where: any = {};

    // Solo aplicar filtros si se proporcionan los tres parámetros
    if (filterField && filterRule && filterValue) {
      // Validar que filterField sea un campo válido del modelo User
      const validFields = ['email', 'name', 'estado'];
      if (!validFields.includes(filterField)) {
        throw new BadRequestException(`Campo de filtro inválido: ${filterField}. Campos válidos: ${validFields.join(', ')}`);
      }

      switch (filterRule) {
        case 'eq':
          where[filterField] = filterValue;
          break;
        case 'like':
          where[filterField] = { contains: filterValue, mode: 'insensitive' };
          break;
        case 'nlike':
          where[filterField] = { not: { contains: filterValue, mode: 'insensitive' } };
          break;
        default:
          throw new BadRequestException(`Regla de filtro inválida: ${filterRule}`);
      }
    }

    // Construir orderBy
    const orderBy: any = {};
    const sortFieldFinal = sortBy || sortField;
    if (sortFieldFinal) {
      // Validar que el campo de ordenamiento sea válido
      const validSortFields = ['email', 'name', 'createdAt', 'estado'];
      if (!validSortFields.includes(sortFieldFinal)) {
        throw new BadRequestException(`Campo de ordenamiento inválido: ${sortFieldFinal}. Campos válidos: ${validSortFields.join(', ')}`);
      }
      orderBy[sortFieldFinal] = sortOrder.toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    // Calcular skip
    const skip = offset !== undefined ? offset : (page - 1) * limit;

    // Obtener usuarios
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const pageCount = Math.ceil(total / limit);
    const currentPage = offset !== undefined ? Math.floor(offset / limit) + 1 : page;

    return {
      data: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        estado: user.estado,
        createdAt: user.createdAt.toISOString(),
        lastLogin: user.lastLogin?.toISOString(),
        roles: user.roles.map((ur) => ({
          id: ur.role.id,
          nombre: ur.role.nombre,
          descripcion: ur.role.descripcion,
        })),
      })),
      meta: {
        page: currentPage,
        take: limit,
        itemCount: total,
        pageCount: pageCount,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < pageCount,
      },
    };
  }
}
