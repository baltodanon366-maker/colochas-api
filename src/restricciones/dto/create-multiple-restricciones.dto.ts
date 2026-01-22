import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsArray, Min, Max, ArrayMinSize, IsOptional, IsEnum, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoRestriccion } from './create-restriccion.dto';

export class NumeroRestriccionDto {
  @ApiProperty({
    description: 'Número a restringir (0-99)',
    example: 5,
  })
  @IsInt({ message: 'El número debe ser un entero' })
  @Min(0, { message: 'El número debe ser mayor o igual a 0' })
  @Max(99, { message: 'El número debe ser menor o igual a 99' })
  numero: number;

  @ApiProperty({
    description: 'Tipo de restricción para este número',
    enum: TipoRestriccion,
    required: false,
    default: 'completo',
  })
  @IsOptional()
  @IsEnum(TipoRestriccion)
  tipoRestriccion?: TipoRestriccion;

  @ApiProperty({
    description: 'Límite de monto si tipoRestriccion es "monto"',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El límite de monto debe ser un número' })
  @Min(0, { message: 'El límite de monto debe ser mayor o igual a 0' })
  @Type(() => Number)
  limiteMonto?: number;

  @ApiProperty({
    description: 'Límite de cantidad si tipoRestriccion es "cantidad"',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El límite de cantidad debe ser un entero' })
  @Min(1, { message: 'El límite de cantidad debe ser mayor o igual a 1' })
  limiteCantidad?: number;
}

export class CreateMultipleRestriccionesDto {
  @ApiProperty({
    description: 'ID del turno',
    example: 1,
  })
  @IsInt({ message: 'El turno_id debe ser un número entero' })
  @IsNotEmpty({ message: 'El turno_id es requerido' })
  turnoId: number;

  @ApiProperty({
    description: 'Array de números simples (00-99) - Modo simple para compatibilidad',
    example: [5, 12, 21, 33],
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Los números deben ser un array' })
  @IsInt({ each: true, message: 'Cada número debe ser un entero' })
  @Min(0, { each: true, message: 'Cada número debe ser mayor o igual a 0' })
  @Max(99, { each: true, message: 'Cada número debe ser menor o igual a 99' })
  numeros?: number[];

  @ApiProperty({
    description: 'Array de objetos con número y límites - Modo avanzado',
    type: [NumeroRestriccionDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Los números con restricciones deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => NumeroRestriccionDto)
  numerosConRestricciones?: NumeroRestriccionDto[];

  @ApiProperty({
    description: 'Fecha de la restricción (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'La fecha es requerida' })
  fecha: string;

  // Tipo y límites globales (aplicados a todos los números si se usa el modo simple)
  @ApiProperty({
    description: 'Tipo de restricción global (aplicado a todos los números en modo simple)',
    enum: TipoRestriccion,
    required: false,
    default: 'completo',
  })
  @IsOptional()
  @IsEnum(TipoRestriccion)
  tipoRestriccion?: TipoRestriccion;

  @ApiProperty({
    description: 'Límite de monto global (aplicado a todos los números en modo simple)',
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El límite de monto debe ser un número' })
  @Min(0, { message: 'El límite de monto debe ser mayor o igual a 0' })
  @Type(() => Number)
  limiteMonto?: number;

  @ApiProperty({
    description: 'Límite de cantidad global (aplicado a todos los números en modo simple)',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El límite de cantidad debe ser un entero' })
  @Min(1, { message: 'El límite de cantidad debe ser mayor o igual a 1' })
  limiteCantidad?: number;
}

