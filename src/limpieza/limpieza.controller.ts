import { Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { LimpiezaService } from './limpieza.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Limpieza')
@Controller('limpieza')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles('admin')
export class LimpiezaController {
  constructor(private readonly limpiezaService: LimpiezaService) {}

  @Get('estadisticas')
  @ApiOperation({ summary: 'Obtener estadísticas de datos a limpiar (solo admin)' })
  @ApiQuery({ name: 'dias', required: false, type: Number, description: 'Días de antigüedad (default: 90)' })
  @ApiResponse({ status: 200, description: 'Estadísticas de limpieza' })
  async obtenerEstadisticas(@Query('dias') dias?: string) {
    const diasAntiguedad = dias ? parseInt(dias) : 90;
    const estadisticas = await this.limpiezaService.obtenerEstadisticasLimpieza(diasAntiguedad);
    return {
      succeeded: true,
      title: 'Estadísticas de limpieza',
      message: 'Estadísticas obtenidas correctamente',
      data: estadisticas,
    };
  }

  @Post('ejecutar')
  @ApiOperation({ summary: 'Ejecutar limpieza de datos antiguos (solo admin)' })
  @ApiQuery({ name: 'dias', required: false, type: Number, description: 'Días de antigüedad (default: 90)' })
  @ApiResponse({ status: 200, description: 'Limpieza ejecutada correctamente' })
  async ejecutarLimpieza(@Query('dias') dias?: string) {
    const diasAntiguedad = dias ? parseInt(dias) : 90;
    const resultado = await this.limpiezaService.limpiarDatosAntiguos(diasAntiguedad);
    return {
      succeeded: true,
      title: 'Limpieza ejecutada',
      message: 'Limpieza de datos antiguos ejecutada correctamente',
      data: resultado,
    };
  }
}
