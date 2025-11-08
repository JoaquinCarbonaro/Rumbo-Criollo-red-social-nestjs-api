import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

//dto usado para validar los datos recibidos al actualizar un usuario
export class ActualizarUsuarioDto {
  //nombre opcional con longitud entre 2 y 60 caracteres
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @IsOptional()
  nombre?: string

  //apellido opcional con longitud entre 2 y 60 caracteres
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @IsOptional()
  apellido?: string

  //correo electronico opcional con validacion de formato
  @IsEmail()
  @IsOptional()
  email?: string

  //nombre de usuario opcional con longitud entre 4 y 20 caracteres
  @IsString()
  @MinLength(4)
  @MaxLength(20)
  @IsOptional()
  userName?: string

  //fecha de nacimiento opcional, se recibe como string 'YYYY-MM-DD' desde el front
  @IsString()
  @IsOptional()
  fechaNacimiento?: string

  //descripcion opcional con longitud entre 5 y 200 caracteres
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @IsOptional()
  descripcion?: string
}
