import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class SignUpDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'John Doe',
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  name: string;

  @ApiProperty({
    description: 'Número de teléfono (8 dígitos)',
    example: '12345678',
    minLength: 8,
    maxLength: 8,
  })
  @IsString({ message: 'El teléfono debe ser un texto' })
  @IsNotEmpty({ message: 'El teléfono es requerido' })
  @Length(8, 8, { message: 'El teléfono debe tener exactamente 8 dígitos' })
  @Matches(/^\d{8}$/, { message: 'El teléfono debe contener solo 8 dígitos numéricos' })
  telefono: string;

  @ApiProperty({
    description: 'Nombre de usuario',
    example: 'john_doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El username debe ser un texto' })
  username?: string;
}
