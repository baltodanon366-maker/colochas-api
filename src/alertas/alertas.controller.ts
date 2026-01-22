import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
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
import { AlertasService } from './alertas.service';
import { MarcarAlertaDto } from './dto/marcar-alerta.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Alertas')
@Controller('api/v1/alertas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class AlertasController {
  constructor(private readonly alertasService: AlertasService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas mis alertas' })
  @ApiQuery({ name: 'estado', required: false, enum: ['activa', 'vista', 'resuelta'] })
  @ApiResponse({ status: 200, description: 'Lista de alertas' })
  findAll(@CurrentUser() user: any, @Query('estado') estado?: string) {
    return this.alertasService.findAll(user.id, estado);
  }

  @Get('activas')
  @ApiOperation({ summary: 'Obtener alertas activas' })
  @ApiResponse({ status: 200, description: 'Lista de alertas activas' })
  obtenerActivas(@CurrentUser() user: any) {
    return this.alertasService.obtenerAlertasActivas(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener alerta por ID' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Alerta encontrada' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.alertasService.findOne(id, user.id);
  }

  @Patch(':id/marcar')
  @ApiOperation({ summary: 'Marcar alerta como vista o resuelta' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Alerta marcada exitosamente' })
  @ApiResponse({ status: 404, description: 'Alerta no encontrada' })
  marcarAlerta(
    @Param('id', ParseIntPipe) id: number,
    @Body() marcarAlertaDto: MarcarAlertaDto,
    @CurrentUser() user: any,
  ) {
    return this.alertasService.marcarAlerta(id, user.id, marcarAlertaDto);
  }
}

