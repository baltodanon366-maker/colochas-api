import { ApiProperty } from '@nestjs/swagger';

export class UpdateRestriccionDto {
  // Con el nuevo esquema simplificado, las restricciones solo se crean o eliminan
  // No hay campos actualizables. Este DTO se mantiene por compatibilidad pero no se usa.
  // Para "actualizar" una restricción, se elimina y se crea de nuevo.
}

