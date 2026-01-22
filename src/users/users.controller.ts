import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Usuarios')
@Controller('api/v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nuevo usuario (Solo admin)' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al crear usuario' })
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: any) {
    return this.usersService.create(createUserDto, user.id);
  }

  // Endpoint eliminado por redundancia:
  // GET /users → Usar GET /api/v1/auth (más completo con paginación y filtros)

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener usuario por ID (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar usuario (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Post(':id/activate')
  @Roles('admin')
  @ApiOperation({ summary: 'Activar usuario (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Usuario activado' })
  activate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.activate(id, user.id);
  }

  @Post(':id/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar usuario (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Usuario desactivado' })
  deactivate(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.deactivate(id, user.id);
  }

  @Post(':id/password')
  @ApiOperation({ summary: 'Actualizar contraseña del usuario' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(id, updatePasswordDto);
  }

  @Get(':id/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener roles de un usuario (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Roles del usuario' })
  getRoles(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getRoles(id);
  }

  @Post(':id/roles/:roleId')
  @Roles('admin')
  @ApiOperation({ summary: 'Asignar rol a usuario (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'roleId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Rol asignado exitosamente' })
  assignRole(
    @Param('id', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.assignRole(userId, roleId, user.id);
  }

  @Delete(':id/roles/:roleId')
  @Roles('admin')
  @ApiOperation({ summary: 'Remover rol de usuario (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'roleId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Rol removido exitosamente' })
  removeRole(
    @Param('id', ParseIntPipe) userId: number,
    @Param('roleId', ParseIntPipe) roleId: number,
    @CurrentUser() user: any,
  ) {
    return this.usersService.removeRole(userId, roleId, user.id);
  }
}

