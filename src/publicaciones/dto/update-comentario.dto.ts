import { IsString, MinLength } from 'class-validator'

export class UpdateComentarioDto {
  //nuevo contenido del comentario
  @IsString()
  @MinLength(1)
  contenido!: string
}
