import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';

export enum EstadoAlertaAccion {
  vista = 'vista',
  resuelta = 'resuelta',
}

export class MarcarAlertaDto {
  @ApiProperty({
    description: 'Acción a realizar',
    enum: EstadoAlertaAccion,
    example: 'vista',
  })
  @IsEnum(EstadoAlertaAccion, { message: 'La acción debe ser "vista" o "resuelta"' })
  accion: EstadoAlertaAccion;
}

