import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Ventas')
@Controller('api/v1/ventas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @Roles('admin', 'vendedor')
  @ApiOperation({ summary: 'Crear nueva venta' })
  @ApiResponse({ status: 201, description: 'Venta creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al crear venta' })
  create(@Body() createVentaDto: CreateVentaDto, @CurrentUser() user: any) {
    if (!user?.id) {
      throw new BadRequestException('Usuario no identificado. Vuelve a iniciar sesión.');
    }
    return this.ventasService.create(createVentaDto, user.id);
  }

  // Endpoints eliminados por redundancia:
  // - GET /api/v1/ventas → Usar GET /api/v1/historial/ventas
  // - GET /api/v1/ventas/mis-ventas → Usar GET /api/v1/historial/ventas (sin usuarioId para vendedores)

  @Get('boucher/:numeroBoucher')
  @ApiOperation({ summary: 'Buscar venta por número de boucher' })
  @ApiParam({ name: 'numeroBoucher', type: 'string' })
  @ApiResponse({ status: 200, description: 'Venta encontrada' })
  @ApiResponse({ status: 404, description: 'Boucher no encontrado' })
  buscarBoucher(@Param('numeroBoucher') numeroBoucher: string) {
    return this.ventasService.buscarBoucher(numeroBoucher);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener venta por ID' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Venta encontrada' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ventasService.findOne(id);
  }

  @Delete(':id')
  @Roles('admin', 'vendedor')
  @ApiOperation({ summary: 'Eliminar venta (hard delete)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Venta eliminada' })
  @ApiResponse({ status: 404, description: 'Venta no encontrada' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.ventasService.delete(id);
    return { message: 'Venta eliminada correctamente' };
  }
}

