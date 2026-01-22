import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { RestriccionesService } from './restricciones.service';
import { CreateRestriccionDto } from './dto/create-restriccion.dto';
import { CreateMultipleRestriccionesDto } from './dto/create-multiple-restricciones.dto';
import { UpdateRestriccionDto } from './dto/update-restriccion.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Restricciones de Números')
@Controller('api/v1/restricciones')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class RestriccionesController {
  constructor(private readonly restriccionesService: RestriccionesService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Restringir un número (Solo admin)' })
  @ApiResponse({ status: 201, description: 'Número restringido exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al restringir número' })
  create(@Body() createRestriccionDto: CreateRestriccionDto) {
    return this.restriccionesService.create(createRestriccionDto);
  }

  @Post('multiple')
  @Roles('admin')
  @ApiOperation({ summary: 'Restringir múltiples números a la vez (Solo admin)' })
  @ApiResponse({ status: 201, description: 'Números restringidos exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al restringir números' })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  async createMultiple(@Body() createMultipleDto: CreateMultipleRestriccionesDto) {
    try {
      return await this.restriccionesService.createMultiple(createMultipleDto);
    } catch (error: any) {
      // Si es una excepción de NestJS, relanzarla
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      // Para otros errores, registrar y lanzar un error genérico
      console.error('Error en createMultiple controller:', error);
      throw new BadRequestException(
        error.message || 'Error al crear restricciones. Verifique los datos enviados.',
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las restricciones' })
  @ApiQuery({ name: 'turnoId', required: false, type: Number })
  @ApiQuery({ name: 'fecha', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de restricciones' })
  findAll(
    @Query('turnoId') turnoId?: string,
    @Query('fecha') fecha?: string,
  ) {
    return this.restriccionesService.findAll(
      turnoId ? parseInt(turnoId) : undefined,
      fecha,
    );
  }

  @Get('verificar')
  @ApiOperation({ summary: 'Verificar si un número está restringido' })
  @ApiQuery({ name: 'turnoId', required: true, type: Number })
  @ApiQuery({ name: 'numero', required: true, type: Number })
  @ApiQuery({ name: 'fecha', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Estado de restricción' })
  verificar(
    @Query('turnoId') turnoId: string,
    @Query('numero') numero: string,
    @Query('fecha') fecha: string,
  ) {
    return this.restriccionesService.verificarRestriccion(
      parseInt(turnoId),
      parseInt(numero),
      fecha,
    );
  }

  @Get('verificar-multiple')
  @ApiOperation({ summary: 'Verificar si múltiples números están restringidos' })
  @ApiQuery({ name: 'turnoId', required: true, type: Number })
  @ApiQuery({ name: 'numeros', required: true, type: String, description: 'Array de números separados por coma (ej: 5,12,21)' })
  @ApiQuery({ name: 'fecha', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Estado de restricciones' })
  @ApiResponse({ status: 400, description: 'Error en los parámetros' })
  verificarMultiples(
    @Query('turnoId', ParseIntPipe) turnoId: number,
    @Query('numeros') numeros: string,
    @Query('fecha') fecha: string,
  ) {
    if (!numeros || !fecha) {
      throw new BadRequestException('numeros y fecha son requeridos');
    }

    const numerosArray = numeros
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));

    if (numerosArray.length === 0) {
      throw new BadRequestException('Debe incluir al menos un número válido');
    }

    return this.restriccionesService.verificarMultiples(
      turnoId,
      numerosArray,
      fecha,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener restricción por ID' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Restricción encontrada' })
  @ApiResponse({ status: 404, description: 'Restricción no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.restriccionesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar restricción (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Restricción actualizada' })
  @ApiResponse({ status: 404, description: 'Restricción no encontrada' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRestriccionDto: UpdateRestriccionDto,
  ) {
    return this.restriccionesService.update(id, updateRestriccionDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar restricción por ID (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Restricción eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Restricción no encontrada' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.restriccionesService.remove(id);
  }

  @Delete('numero/:turnoId/:numero')
  @Roles('admin')
  @ApiOperation({ summary: 'Desrestringir un número específico (Solo admin)' })
  @ApiParam({ name: 'turnoId', type: 'number' })
  @ApiParam({ name: 'numero', type: 'number' })
  @ApiQuery({ name: 'fecha', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Número desrestringido exitosamente' })
  @ApiResponse({ status: 404, description: 'Restricción no encontrada' })
  removeByNumero(
    @Param('turnoId', ParseIntPipe) turnoId: number,
    @Param('numero', ParseIntPipe) numero: number,
    @Query('fecha') fecha: string,
  ) {
    return this.restriccionesService.removeByNumero(turnoId, numero, fecha);
  }

  @Delete('multiple')
  @Roles('admin')
  @ApiOperation({ summary: 'Desrestringir múltiples números (Solo admin)' })
  @ApiQuery({ name: 'turnoId', required: true, type: Number })
  @ApiQuery({ name: 'numeros', required: true, type: String, description: 'Array de números separados por coma (ej: 5,12,21)' })
  @ApiQuery({ name: 'fecha', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Números desrestringidos exitosamente' })
  @ApiResponse({ status: 400, description: 'Error en los parámetros' })
  removeMultiple(
    @Query('turnoId') turnoId: string,
    @Query('numeros') numeros: string,
    @Query('fecha') fecha: string,
  ) {
    if (!turnoId || !numeros || !fecha) {
      throw new BadRequestException('turnoId, numeros y fecha son requeridos');
    }

    const numerosArray = numeros
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));

    if (numerosArray.length === 0) {
      throw new BadRequestException('Debe incluir al menos un número válido');
    }

    return this.restriccionesService.removeMultiple(
      parseInt(turnoId),
      numerosArray,
      fecha,
    );
  }
}

