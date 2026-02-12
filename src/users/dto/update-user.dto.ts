import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  name?: string;

  @ApiProperty({
    description: 'Número de teléfono (8 dígitos)',
    example: '87654321',
    required: false,
    minLength: 8,
    maxLength: 8,
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto' })
  @Length(8, 8, { message: 'El teléfono debe tener exactamente 8 dígitos' })
  @Matches(/^\d{8}$/, { message: 'El teléfono debe contener solo 8 dígitos numéricos' })
  telefono?: string;
}
