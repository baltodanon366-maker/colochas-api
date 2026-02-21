import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class LoginDto {
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
}
