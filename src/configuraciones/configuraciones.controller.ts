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
import { ConfiguracionesService } from './configuraciones.service';
import { CreateConfiguracionDto } from './dto/create-configuracion.dto';
import { UpdateConfiguracionDto } from './dto/update-configuracion.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Configuraciones')
@Controller('api/v1/configuraciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class ConfiguracionesController {
  constructor(private readonly configuracionesService: ConfiguracionesService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nueva configuración (Solo admin)' })
  @ApiResponse({ status: 201, description: 'Configuración creada exitosamente' })
  create(
    @Body() createConfiguracionDto: CreateConfiguracionDto,
    @CurrentUser() user: any,
  ) {
    return this.configuracionesService.create(createConfiguracionDto, user.id);
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener todas las configuraciones (Solo admin)' })
  @ApiResponse({ status: 200, description: 'Lista de configuraciones' })
  findAll() {
    return this.configuracionesService.findAll();
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener configuración por ID (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Configuración encontrada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.configuracionesService.findOne(id);
  }

  @Get('clave/:clave')
  @ApiOperation({ summary: 'Obtener configuración por clave' })
  @ApiParam({ name: 'clave', type: 'string' })
  @ApiResponse({ status: 200, description: 'Configuración encontrada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  findByClave(@Param('clave') clave: string) {
    return this.configuracionesService.findByClave(clave);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar configuración (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  @ApiResponse({ status: 404, description: 'Configuración no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateConfiguracionDto: UpdateConfiguracionDto,
    @CurrentUser() user: any,
  ) {
    return this.configuracionesService.update(id, updateConfiguracionDto, user.id);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Desactivar configuración (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Configuración desactivada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.configuracionesService.remove(id);
  }
}

