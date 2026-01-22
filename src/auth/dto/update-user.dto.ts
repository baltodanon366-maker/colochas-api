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
    description: 'Número de teléfono',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El número de teléfono debe ser un texto' })
  phoneNumber?: string;
}

