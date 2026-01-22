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
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Roles')
@Controller('api/v1/roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nuevo rol (Solo admin)' })
  @ApiResponse({ status: 201, description: 'Rol creado exitosamente' })
  create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() user: any) {
    return this.rolesService.create(createRoleDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los roles' })
  @ApiResponse({ status: 200, description: 'Lista de roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener rol por ID' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Rol encontrado' })
  @ApiResponse({ status: 404, description: 'Rol no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar rol (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Rol actualizado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar rol (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Rol desactivado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.remove(id);
  }

  @Get(':id/permisos')
  @ApiOperation({ summary: 'Obtener permisos de un rol' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Permisos del rol' })
  getPermisos(@Param('id', ParseIntPipe) id: number) {
    return this.rolesService.getPermisos(id);
  }

  @Post(':id/permisos/:permisoId')
  @Roles('admin')
  @ApiOperation({ summary: 'Asignar permiso a rol (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'permisoId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Permiso asignado exitosamente' })
  assignPermiso(
    @Param('id', ParseIntPipe) roleId: number,
    @Param('permisoId', ParseIntPipe) permisoId: number,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.assignPermiso(roleId, permisoId, user.id);
  }

  @Delete(':id/permisos/:permisoId')
  @Roles('admin')
  @ApiOperation({ summary: 'Remover permiso de rol (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiParam({ name: 'permisoId', type: 'number' })
  @ApiResponse({ status: 200, description: 'Permiso removido exitosamente' })
  removePermiso(
    @Param('id', ParseIntPipe) roleId: number,
    @Param('permisoId', ParseIntPipe) permisoId: number,
    @CurrentUser() user: any,
  ) {
    return this.rolesService.removePermiso(roleId, permisoId, user.id);
  }
}

