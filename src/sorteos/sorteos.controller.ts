import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { SorteosService } from './sorteos.service';
import { CreateSorteoDto } from './dto/create-sorteo.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Sorteos')
@Controller('sorteos')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class SorteosController {
  constructor(private readonly sorteosService: SorteosService) {}

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Crear nuevo sorteo (Solo admin)' })
  @ApiResponse({ status: 201, description: 'Sorteo creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al crear sorteo' })
  create(@Body() createSorteoDto: CreateSorteoDto, @CurrentUser() user: any) {
    return this.sorteosService.create(createSorteoDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los sorteos' })
  @ApiQuery({ name: 'fecha', required: false, type: String, example: '2024-01-15' })
  @ApiResponse({ status: 200, description: 'Lista de sorteos' })
  findAll(@Query('fecha') fecha?: string) {
    return this.sorteosService.findAll(fecha);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener sorteo por ID' })
  @ApiParam({ name: 'id', type: 'number' })
  @ApiResponse({ status: 200, description: 'Sorteo encontrado' })
  @ApiResponse({ status: 404, description: 'Sorteo no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.sorteosService.findOne(id);
  }
}

