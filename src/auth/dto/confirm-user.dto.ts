import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ConfirmUserDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'El email debe ser válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @ApiProperty({
    description: 'Código de confirmación',
    example: '123456',
  })
  @IsString({ message: 'El código de confirmación debe ser un texto' })
  @IsNotEmpty({ message: 'El código de confirmación es requerido' })
  confirmationCode: string;
}

