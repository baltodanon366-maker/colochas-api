import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Contraseña actual',
    example: 'oldPassword123',
  })
  @IsString({ message: 'La contraseña actual debe ser un texto' })
  @IsNotEmpty({ message: 'La contraseña actual es requerida' })
  currentPassword: string;

  @ApiProperty({
    description: 'Nueva contraseña',
    example: 'newPassword123',
    minLength: 6,
  })
  @IsString({ message: 'La nueva contraseña debe ser un texto' })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}

