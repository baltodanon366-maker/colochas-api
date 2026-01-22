import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { HistorialService } from './historial.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Historial')
@Controller('api/v1/historial')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class HistorialController {
  constructor(private readonly historialService: HistorialService) {}

  @Get('ventas')
  @ApiOperation({ summary: 'Obtener historial de ventas' })
  @ApiQuery({ name: 'fechaInicio', required: false, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'fechaFin', required: false, type: String, example: '2024-01-31' })
  @ApiQuery({ name: 'turnoId', required: false, type: Number })
  @ApiQuery({ name: 'usuarioId', required: false, type: Number, description: 'Solo admin puede filtrar por usuario' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Historial de ventas' })
  obtenerHistorialVentas(
    @CurrentUser() user: any,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('turnoId') turnoId?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    // Si es admin, puede ver todas las ventas (usuarioId = null) o filtrar por usuario
    // Si es vendedor, solo ve sus ventas
    const isAdmin = user.roles?.some((role: string) => role.toLowerCase() === 'admin');
    
    let usuarioIdFinal: number | null = null;
    
    if (isAdmin) {
      // Admin puede filtrar por usuario específico o ver todas (null)
      usuarioIdFinal = usuarioId ? parseInt(usuarioId) : null;
    } else {
      // Vendedor solo ve sus propias ventas
      usuarioIdFinal = typeof user.id === 'string' ? parseInt(user.id) : user.id;
    }

    return this.historialService.obtenerHistorialVentas(
      usuarioIdFinal,
      fechaInicio || null,
      fechaFin || null,
      turnoId ? parseInt(turnoId) : null,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('analisis-numeros')
  @ApiOperation({ summary: 'Obtener análisis de números vendidos' })
  @ApiQuery({ name: 'fechaInicio', required: false, type: String })
  @ApiQuery({ name: 'fechaFin', required: false, type: String })
  @ApiQuery({ name: 'turnoId', required: false, type: Number })
  @ApiQuery({ name: 'categoria', required: false, type: String, description: 'diaria o tica' })
  @ApiQuery({ name: 'usuarioId', required: false, type: Number, description: 'Solo admin puede filtrar por usuario' })
  @ApiResponse({ status: 200, description: 'Análisis de números vendidos' })
  obtenerAnalisisNumeros(
    @CurrentUser() user: any,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('turnoId') turnoId?: string,
    @Query('categoria') categoria?: string,
    @Query('usuarioId') usuarioId?: string,
  ) {
    const isAdmin = user.roles?.some((role: string) => role.toLowerCase() === 'admin');
    
    let usuarioIdFinal: number | null = null;
    
    if (isAdmin) {
      usuarioIdFinal = usuarioId ? parseInt(usuarioId) : null;
    } else {
      usuarioIdFinal = typeof user.id === 'string' ? parseInt(user.id) : user.id;
    }

    return this.historialService.obtenerAnalisisNumeros(
      usuarioIdFinal,
      fechaInicio || null,
      fechaFin || null,
      turnoId ? parseInt(turnoId) : null,
      categoria || null,
    );
  }

  @Get('reporte-cierre')
  @ApiOperation({ summary: 'Obtener reporte de cierre por turno' })
  @ApiQuery({ name: 'fechaInicio', required: false, type: String })
  @ApiQuery({ name: 'fechaFin', required: false, type: String })
  @ApiQuery({ name: 'turnoId', required: true, type: Number })
  @ApiQuery({ name: 'usuarioId', required: false, type: Number, description: 'Solo admin puede filtrar por usuario' })
  @ApiResponse({ status: 200, description: 'Reporte de cierre por turno' })
  obtenerReporteCierre(
    @CurrentUser() user: any,
    @Query('fechaInicio') fechaInicio?: string,
    @Query('fechaFin') fechaFin?: string,
    @Query('turnoId') turnoId?: string,
    @Query('usuarioId') usuarioId?: string,
  ) {
    const isAdmin = user.roles?.some((role: string) => role.toLowerCase() === 'admin');
    
    let usuarioIdFinal: number | null = null;
    
    if (isAdmin) {
      usuarioIdFinal = usuarioId ? parseInt(usuarioId) : null;
    } else {
      usuarioIdFinal = typeof user.id === 'string' ? parseInt(user.id) : user.id;
    }

    return this.historialService.obtenerReporteCierre(
      usuarioIdFinal,
      fechaInicio || null,
      fechaFin || null,
      turnoId ? parseInt(turnoId) : null,
    );
  }
}

