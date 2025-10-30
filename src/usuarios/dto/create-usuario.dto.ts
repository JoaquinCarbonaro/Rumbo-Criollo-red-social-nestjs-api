import { IsEmail, IsString, MinLength, IsOptional, IsDateString } from 'class-validator';

export class CreateUsuarioDto {
  //valido que el nombre sea texto
  @IsString()
  nombre!: string;

  //valido que el apellido sea texto
  @IsString()
  apellido!: string;

  //valido que el email tenga formato correcto
  @IsEmail()
  email!: string;

  //valido que el username sea texto
  @IsString()
  userName!: string;

  //valido que la contraseña tenga al menos 8 caracteres
  @IsString()
  @MinLength(8)
  password!: string;

  //valido que la fecha tenga formato ISO (YYYY-MM-DD)
  @IsDateString()
  fechaNacimiento!: string;

  //valido que la descripcion sea texto
  @IsString()
  descripcion!: string;

  //guardo la ruta relativa de la imagen en /images
  @IsString()
  @IsOptional()
  imagenPerfil?: string;

  //defino el perfil opcional del usuario (usuario o administrador)
  @IsString()
  @IsOptional()
  perfil?: 'usuario' | 'administrador';
}
