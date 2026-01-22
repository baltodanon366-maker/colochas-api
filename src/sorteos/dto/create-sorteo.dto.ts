import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsOptional, Min, Max } from 'class-validator';

export class CreateSorteoDto {
  @ApiProperty({
    description: 'ID del turno',
    example: 1,
  })
  @IsInt({ message: 'El turno_id debe ser un número entero' })
  @IsNotEmpty({ message: 'El turno_id es requerido' })
  turnoId: number;

  @ApiProperty({
    description: 'Fecha del sorteo (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'La fecha es requerida' })
  fecha: string;

  @ApiProperty({
    description: 'Número ganador (00-99)',
    example: 42,
    minimum: 0,
    maximum: 99,
  })
  @IsInt({ message: 'El número ganador debe ser un entero' })
  @Min(0, { message: 'El número ganador debe ser mayor o igual a 0' })
  @Max(99, { message: 'El número ganador debe ser menor o igual a 99' })
  @IsNotEmpty({ message: 'El número ganador es requerido' })
  numeroGanador: number;

  @ApiProperty({
    description: 'Monto del premio',
    example: 1000.00,
    required: false,
  })
  @IsOptional()
  montoPremio?: number;

  @ApiProperty({
    description: 'Descripción del sorteo',
    example: 'Sorteo del turno de la tarde',
    required: false,
  })
  @IsOptional()
  descripcion?: string;
}

