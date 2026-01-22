import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { KpisService } from './kpis.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('KPIs')
@Controller('api/v1/kpis')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get('numero-mas-vendido')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener número más vendido (Solo admin) - Implementación futura' })
  @ApiQuery({ name: 'fechaInicio', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'fechaFin', required: true, type: String, example: '2024-01-31' })
  @ApiResponse({ status: 200, description: 'Números más vendidos' })
  obtenerNumeroMasVendido(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
  ) {
    return this.kpisService.obtenerNumeroMasVendido(fechaInicio, fechaFin);
  }

  // Endpoint eliminado: GET /api/v1/kpis/numero-mas-ganador
  // No se utilizará más en el sistema

  @Get('empleado-mas-ventas')
  @Roles('admin')
  @ApiOperation({ summary: 'Obtener empleado con más ventas (Solo admin)' })
  @ApiQuery({ name: 'fechaInicio', required: true, type: String, example: '2024-01-01' })
  @ApiQuery({ name: 'fechaFin', required: true, type: String, example: '2024-01-31' })
  @ApiResponse({ status: 200, description: 'Empleados con más ventas' })
  obtenerEmpleadoMasVentas(
    @Query('fechaInicio') fechaInicio: string,
    @Query('fechaFin') fechaFin: string,
  ) {
    return this.kpisService.obtenerEmpleadoMasVentas(fechaInicio, fechaFin);
  }

  @Get('ventas-hoy')
  @Roles('admin', 'vendedor')
  @ApiOperation({ summary: 'Obtener resumen de ventas del día actual' })
  @ApiResponse({ status: 200, description: 'Resumen de ventas de hoy' })
  obtenerVentasHoy() {
    return this.kpisService.obtenerVentasHoy();
  }
}

