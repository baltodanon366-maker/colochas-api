import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateConfiguracionDto {
  @ApiProperty({
    description: 'Valor de la configuración',
    example: '150',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El valor debe ser un texto' })
  valor?: string;

  @ApiProperty({
    description: 'Descripción de la configuración',
    example: 'Límite por defecto de ventas por número',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un texto' })
  descripcion?: string;

  @ApiProperty({
    description: 'Tipo de dato',
    example: 'number',
    enum: ['string', 'number', 'boolean', 'json'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El tipo debe ser un texto' })
  tipo?: string;
}

