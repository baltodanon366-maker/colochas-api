import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsersQueryDto {
  @ApiProperty({
    description: 'Número de página',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page debe ser un número entero' })
  @Min(1, { message: 'page debe ser mayor a 0' })
  page?: number = 1;

  @ApiProperty({
    description: 'Número de items por página',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit debe ser un número entero' })
  @Min(1, { message: 'limit debe ser mayor a 0' })
  limit?: number = 10;

  @ApiProperty({
    description: 'Offset para paginación (sobrescribe page y limit)',
    example: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset debe ser un número entero' })
  @Min(0, { message: 'offset debe ser mayor o igual a 0' })
  offset?: number = 0;

  @ApiProperty({
    description: 'Campo para filtrar',
    enum: ['email', 'name'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'filterField debe ser un texto' })
  @IsIn(['email', 'name'], {
    message: 'filterField debe ser uno de: email, name',
  })
  filterField?: string;

  @ApiProperty({
    description: 'Regla de filtro',
    enum: ['eq', 'lt', 'lte', 'like', 'gt', 'gte', 'ne', 'in', 'nin', 'null', 'nnull', 'nlike'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'filterRule debe ser un texto' })
  @IsIn(['eq', 'lt', 'lte', 'like', 'gt', 'gte', 'ne', 'in', 'nin', 'null', 'nnull', 'nlike'], {
    message: 'filterRule debe ser una regla válida',
  })
  filterRule?: string;

  @ApiProperty({
    description: 'Valor para la condición de filtro',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'filterValue debe ser un texto' })
  filterValue?: string;

  @ApiProperty({
    description: 'Campo para ordenar',
    enum: ['email', 'name', 'createdAt'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'sortField debe ser un texto' })
  @IsIn(['email', 'name', 'createdAt'], {
    message: 'sortField debe ser uno de: email, name, createdAt',
  })
  sortField?: string;

  @ApiProperty({
    description: 'Campo para ordenar (alternativa a sortField)',
    enum: ['email', 'name', 'createdAt'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'sortBy debe ser un texto' })
  @IsIn(['email', 'name', 'createdAt'], {
    message: 'sortBy debe ser uno de: email, name, createdAt',
  })
  sortBy?: string;

  @ApiProperty({
    description: 'Dirección de ordenamiento',
    enum: ['ASC', 'DESC'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'sortOrder debe ser un texto' })
  @IsIn(['ASC', 'DESC'], {
    message: 'sortOrder debe ser ASC o DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';
}

