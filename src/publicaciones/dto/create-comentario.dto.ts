import { IsString, MinLength } from 'class-validator'

export class CreateComentarioDto {
  //texto del comentario a guardar
  @IsString()
  @MinLength(1)
  contenido!: string
}
