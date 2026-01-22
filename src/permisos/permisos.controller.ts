import { Controller, Get, Param, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PermisosService } from './permisos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Permisos')
@Controller('api/v1/permisos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener todos los permisos (Solo admin)' })
  @ApiQuery({ name: 'modulo', required: false, description: 'Filtrar por módulo' })
  @ApiResponse({ status: 200, description: 'Lista de permisos' })
  findAll(@Query('modulo') modulo?: string) {
    if (modulo) {
      return this.permisosService.findByModulo(modulo);
    }
    return this.permisosService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener permiso por ID (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Permiso encontrado' })
  @ApiResponse({ status: 404, description: 'Permiso no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.permisosService.findOne(id);
  }
}

