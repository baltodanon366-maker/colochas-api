import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt } from 'class-validator';

export class CerrarTurnoDto {
  @ApiProperty({
    description: 'ID del turno',
    example: 1,
  })
  @IsInt({ message: 'El turno_id debe ser un número entero' })
  @IsNotEmpty({ message: 'El turno_id es requerido' })
  turnoId: number;

  @ApiProperty({
    description: 'Fecha del turno (YYYY-MM-DD)',
    example: '2024-01-15',
  })
  @IsNotEmpty({ message: 'La fecha es requerida' })
  fecha: string;

  @ApiProperty({
    description: 'Observaciones del cierre',
    example: 'Turno cerrado correctamente',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser un texto' })
  observaciones?: string;
}

