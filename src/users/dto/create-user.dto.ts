import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsArray, IsInt, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nombre completo del usuario (nombre de usuario)',
    example: 'Juan Pérez',
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiProperty({
    description: 'Número de teléfono (8 dígitos fijos)',
    example: '87654321',
    minLength: 8,
    maxLength: 8,
  })
  @IsString({ message: 'El teléfono debe ser un texto' })
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @Length(8, 8, { message: 'El teléfono debe tener exactamente 8 dígitos' })
  @Matches(/^\d{8}$/, { message: 'El teléfono debe contener solo 8 dígitos numéricos' })
  telefono: string;

  @ApiProperty({
    description: 'IDs de roles a asignar al usuario',
    example: [2],
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Los roles deben ser un array' })
  @IsInt({ each: true, message: 'Cada rol debe ser un número entero' })
  roleIds?: number[];
}
