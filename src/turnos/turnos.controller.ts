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
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TurnosService } from './turnos.service';
import { CreateTurnoDto } from './dto/create-turno.dto';
import { UpdateTurnoDto } from './dto/update-turno.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Turnos')
@Controller('api/v1/turnos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class TurnosController {
  constructor(private readonly turnosService: TurnosService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nuevo turno (Solo admin)' })
  @ApiResponse({ status: 201, description: 'Turno creado exitosamente' })
  create(@Body() createTurnoDto: CreateTurnoDto, @CurrentUser() user: any) {
    return this.turnosService.create(createTurnoDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los turnos activos' })
  @ApiResponse({ status: 200, description: 'Lista de turnos' })
  findAll(
    @Query('categoria') categoria?: 'diaria' | 'tica',
    @Query('includeInactivos') includeInactivos?: string,
  ) {
    const includeInactivosBool = includeInactivos === 'true';
    return this.turnosService.findAll(categoria, includeInactivosBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener turno por ID' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Turno encontrado' })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.findOne(id);
  }

  @Get(':id/estado-alerta')
  @ApiOperation({ summary: 'Verificar estado de alerta de cierre de turno' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Estado del turno' })
  verificarAlerta(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.verificarAlertaCierre(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar turno (Solo admin)' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Turno actualizado' })
  @ApiResponse({ status: 404, description: 'Turno no encontrado' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTurnoDto: UpdateTurnoDto,
  ) {
    return this.turnosService.update(id, updateTurnoDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Eliminar o desactivar turno (Solo admin). Los turnos estándar solo se desactivan.' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Turno eliminado o desactivado' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.turnosService.remove(id);
  }
}
