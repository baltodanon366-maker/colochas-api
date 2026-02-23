import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignUpDto } from './dto/sign-up.dto';
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
    const { name, telefono, username } = signUpDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { telefono },
    });

    if (existingUser) {
      throw new BadRequestException('El teléfono ya está registrado');
    }

    const user = await this.prisma.user.create({
      data: {
        name,
        telefono,
        estado: 'inactivo',
      },
    });

    return {
      userId: user.id.toString(),
      name: user.name,
      telefono: user.telefono,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async login(loginDto: LoginDto) {
    const telefono = loginDto.telefono?.trim() ?? '';

    const user = await this.prisma.user.findFirst({
      where: { telefono },
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

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const roles = user.roles
      .filter((ur) => ur.role.estado === 'activo')
      .map((ur) => ur.role.nombre);

    const payload = {
      sub: user.id,
      telefono: user.telefono,
      roles,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || this.configService.get<string>('JWT_SECRET');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      { secret: refreshSecret, expiresIn: refreshExpiresIn as any },
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id.toString(),
        name: user.name,
        telefono: user.telefono,
        roles,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('Refresh token requerido');
    }
    const refreshSecret = this.configService.get<string>('jwt.refreshSecret') || this.configService.get<string>('JWT_SECRET');
    let payload: { sub: number; type?: string };
    try {
      payload = this.jwtService.verify(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token inválido');
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: true } },
      },
    });
    if (!user || user.estado === 'inactivo') {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }
    const roles = user.roles
      .filter((ur) => ur.role.estado === 'activo')
      .map((ur) => ur.role.nombre);
    const newAccessToken = this.jwtService.sign({
      sub: user.id,
      telefono: user.telefono,
      roles,
    });
    return {
      access_token: newAccessToken,
      user: {
        id: user.id.toString(),
        name: user.name,
        telefono: user.telefono,
        roles,
      },
    };
  }

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
        ...(updateUserDto.telefono && { telefono: updateUserDto.telefono }),
      },
    });

    return {
      name: updatedUser.name,
      telefono: updatedUser.telefono,
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

    const where: any = { estado: 'activo' };

    if (filterField && filterRule && filterValue) {
      const validFields = ['telefono', 'name', 'estado'];
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

    const orderBy: any = {};
    const sortFieldFinal = sortBy || sortField;
    if (sortFieldFinal) {
      const validSortFields = ['telefono', 'name', 'createdAt', 'estado'];
      if (!validSortFields.includes(sortFieldFinal)) {
        throw new BadRequestException(`Campo de ordenamiento inválido: ${sortFieldFinal}. Campos válidos: ${validSortFields.join(', ')}`);
      }
      orderBy[sortFieldFinal] = sortOrder.toLowerCase();
    } else {
      orderBy.createdAt = 'desc';
    }

    const skip = offset !== undefined ? offset : (page - 1) * limit;

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
        name: user.name,
        telefono: user.telefono,
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
