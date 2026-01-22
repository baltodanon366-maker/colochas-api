import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsArray, ValidateNested, IsOptional, IsString, Min, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class DetalleVentaDto {
  @ApiProperty({
    description: 'Número de la rifa (00-99)',
    example: 5,
    minimum: 0,
    maximum: 99,
  })
  @IsInt({ message: 'El número debe ser un entero' })
  @IsNotEmpty({ message: 'El número es requerido' })
  @Min(0, { message: 'El número debe ser mayor o igual a 0' })
  numero: number;

  @ApiProperty({
    description: 'Monto pagado por este número',
    example: 50.00,
    minimum: 0,
  })
  @IsNumber({}, { message: 'El monto debe ser un número' })
  @IsNotEmpty({ message: 'El monto es requerido' })
  @Min(0, { message: 'El monto debe ser mayor o igual a 0' })
  monto: number;
}

export class CreateVentaDto {
  @ApiProperty({
    description: 'ID del turno',
    example: 1,
  })
  @IsInt({ message: 'El turno_id debe ser un número entero' })
  @IsNotEmpty({ message: 'El turno_id es requerido' })
  turnoId: number;

  @ApiProperty({
    description: 'Fecha de la venta (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'La fecha es requerida' })
  fecha: string;

  @ApiProperty({
    description: 'Array de detalles de venta (números y montos)',
    type: [DetalleVentaDto],
    example: [
      { numero: 0, monto: 20.00 },
      { numero: 21, monto: 50.00 },
      { numero: 44, monto: 20.00 },
    ],
  })
  @IsArray({ message: 'Los detalles deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => DetalleVentaDto)
  @IsNotEmpty({ message: 'Los detalles son requeridos' })
  detalles: DetalleVentaDto[];

  @ApiProperty({
    description: 'Observaciones de la venta',
    example: 'Cliente pagó en efectivo',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser un texto' })
  observaciones?: string;
}

