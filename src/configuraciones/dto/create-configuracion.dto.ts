import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConfiguracionDto {
  @ApiProperty({
    description: 'Clave única de la configuración',
    example: 'limite_ventas.por_defecto',
  })
  @IsString({ message: 'La clave debe ser un texto' })
  @IsNotEmpty({ message: 'La clave es requerida' })
  clave: string;

  @ApiProperty({
    description: 'Valor de la configuración',
    example: '100',
  })
  @IsString({ message: 'El valor debe ser un texto' })
  @IsNotEmpty({ message: 'El valor es requerido' })
  valor: string;

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
    default: 'string',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El tipo debe ser un texto' })
  tipo?: string;
}

