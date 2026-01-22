import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';

export enum CategoriaTurno {
  diaria = 'diaria',
  tica = 'tica',
}

export class CreateTurnoDto {
  @ApiProperty({
    description: 'Nombre del turno',
    example: 'TURNO 6PM',
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  nombre: string;

  @ApiProperty({
    description: 'Categoría del turno',
    enum: CategoriaTurno,
    example: CategoriaTurno.diaria,
    default: CategoriaTurno.diaria,
    required: false,
  })
  @IsOptional()
  @IsEnum(CategoriaTurno, { message: 'La categoría debe ser "diaria" o "tica"' })
  categoria?: CategoriaTurno;

  @ApiProperty({
    description: 'Hora de inicio del turno',
    example: '18:00',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La hora debe ser un texto' })
  hora?: string;

  @ApiProperty({
    description: 'Hora de cierre del turno',
    example: '20:00',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La hora de cierre debe ser un texto' })
  horaCierre?: string;

  @ApiProperty({
    description: 'Minutos antes del cierre para mostrar alerta',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El tiempo de alerta debe ser un número entero' })
  @Min(1, { message: 'El tiempo de alerta debe ser mayor a 0' })
  tiempoAlerta?: number;

  @ApiProperty({
    description: 'Minutos antes del cierre para bloquear ventas',
    example: 5,
    default: 5,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'El tiempo de bloqueo debe ser un número entero' })
  @Min(1, { message: 'El tiempo de bloqueo debe ser mayor a 0' })
  tiempoBloqueo?: number;

  @ApiProperty({
    description: 'Descripción del turno',
    example: 'Turno de la tarde',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  descripcion?: string;

  @ApiProperty({
    description: 'Mensaje para mostrar en boucher',
    example: 'REVISE SU BOLETO',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El mensaje debe ser un texto' })
  mensaje?: string;
}

