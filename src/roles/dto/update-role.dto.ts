import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Nombre del rol',
    example: 'supervisor',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  nombre?: string;

  @ApiProperty({
    description: 'Descripción del rol',
    example: 'Supervisor de ventas',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  descripcion?: string;
}

