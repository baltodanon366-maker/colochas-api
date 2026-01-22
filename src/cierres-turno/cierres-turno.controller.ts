import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CierresTurnoService } from './cierres-turno.service';
import { CerrarTurnoDto } from './dto/cerrar-turno.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Cierres de Turno')
@Controller('api/v1/cierres-turno')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class CierresTurnoController {
  constructor(private readonly cierresTurnoService: CierresTurnoService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Cerrar un turno (Solo admin)' })
  @ApiResponse({ status: 200, description: 'Turno cerrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al cerrar turno' })
  cerrarTurno(@Body() cerrarTurnoDto: CerrarTurnoDto, @CurrentUser() user: any) {
    return this.cierresTurnoService.cerrarTurno(cerrarTurnoDto, user.id);
  }

  @Get('turno/:turnoId/fecha/:fecha')
  @ApiOperation({ summary: 'Obtener cierre de turno' })
  @ApiParam({ name: 'turnoId', type: 'number' })
  @ApiParam({ name: 'fecha', type: 'string', example: '2024-01-15' })
  @ApiResponse({ status: 200, description: 'Cierre de turno encontrado' })
  obtenerCierre(
    @Param('turnoId') turnoId: string,
    @Param('fecha') fecha: string,
  ) {
    return this.cierresTurnoService.obtenerCierre(parseInt(turnoId), fecha);
  }

  // Endpoint eliminado: GET /turno/:turnoId/fecha/:fecha/ventas
  // Usar GET /api/v1/historial/ventas?turnoId=:turnoId&fechaInicio=:fecha&fechaFin=:fecha
}

