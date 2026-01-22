import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddToAdminDto {
  @ApiProperty({
    description: 'Subject ID del usuario (UUID)',
    example: '12345678-1234-1234-1234-123456789012',
  })
  @IsString({ message: 'El sub debe ser un texto' })
  @IsNotEmpty({ message: 'El sub es requerido' })
  sub: string;
}

