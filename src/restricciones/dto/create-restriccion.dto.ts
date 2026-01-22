import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, Min, Max, IsOptional, IsEnum, IsNumber, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export enum TipoRestriccion {
  COMPLETO = 'completo',
  MONTO = 'monto',
  CANTIDAD = 'cantidad',
}

export class CreateRestriccionDto {
  @ApiProperty({
    description: 'ID del turno',
    example: 1,
  })
  @IsInt({ message: 'El turno_id debe ser un número entero' })
  @IsNotEmpty({ message: 'El turno_id es requerido' })
  turnoId: number;

  @ApiProperty({
    description: 'Número de la rifa (00-99)',
    example: 5,
    minimum: 0,
    maximum: 99,
  })
  @IsInt({ message: 'El número debe ser un entero' })
  @Min(0, { message: 'El número debe ser mayor o igual a 0' })
  @Max(99, { message: 'El número debe ser menor o igual a 99' })
  @IsNotEmpty({ message: 'El número es requerido' })
  numero: number;

  @ApiProperty({
    description: 'Fecha de la restricción (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'La fecha es requerida' })
  fecha: string;

  @ApiProperty({
    description: 'Tipo de restricción: completo (bloquea todo), monto (limita por monto), cantidad (limita por cantidad)',
    example: 'completo',
    enum: TipoRestriccion,
    required: false,
    default: 'completo',
  })
  @IsOptional()
  @IsEnum(TipoRestriccion, { message: 'El tipo de restricción debe ser: completo, monto o cantidad' })
  tipoRestriccion?: TipoRestriccion;

  @ApiProperty({
    description: 'Límite de monto si tipoRestriccion es "monto"',
    example: 50.00,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El límite de monto debe ser un número' })
  @Min(0, { message: 'El límite de monto debe ser mayor o igual a 0' })
  @Type(() => Number)
  limiteMonto?: number;

  @ApiProperty({
    description: 'Límite de cantidad si tipoRestriccion es "cantidad"',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El límite de cantidad debe ser un entero' })
  @Min(1, { message: 'El límite de cantidad debe ser mayor o igual a 1' })
  limiteCantidad?: number;
}

