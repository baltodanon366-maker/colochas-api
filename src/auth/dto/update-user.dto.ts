import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateAuthUserDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  name?: string;

  @ApiProperty({
    description: 'Nombre de usuario',
    example: 'john_doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El username debe ser un texto' })
  username?: string;

  @ApiProperty({
    description: 'Número de teléfono (8 dígitos)',
    example: '12345678',
    required: false,
    minLength: 8,
    maxLength: 8,
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser un texto' })
  telefono?: string;
}

