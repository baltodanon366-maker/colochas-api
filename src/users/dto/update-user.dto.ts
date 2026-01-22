import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

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
    description: 'Email del usuario',
    example: 'juan@colochas.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'El email debe ser válido' })
  email?: string;
}

