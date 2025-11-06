import { IsOptional, IsString, MinLength } from 'class-validator'

export class CreatePublicacionDto {
  //titulo obligatorio, debe ser texto y tener al menos 3 caracteres
  @IsString()
  @MinLength(3)
  titulo!: string

  //descripcion obligatoria, debe ser texto y tener al menos 10 caracteres
  @IsString()
  @MinLength(10)
  descripcion!: string

  //campo opcional con la ruta o nombre de la imagen asociada
  @IsOptional()
  @IsString()
  imagen?: string

  //campo opcional para mantener compatibilidad con versiones anteriores
  @IsOptional()
  @IsString()
  mensaje?: string
}
