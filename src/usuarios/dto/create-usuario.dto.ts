import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { IsFechaNoFutura, IsMayorDeEdad } from '../../utils/date-validators';

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

  //valido que la contraseña tenga al menos 8 caracteres y cumpla la regla de seguridad
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'la contrasena debe tener al menos una mayuscula y un numero',
  })
  password!: string;

  //valido que la fecha tenga formato ISO (YYYY-MM-DD)
  @IsDateString()
  @IsFechaNoFutura()
  @IsMayorDeEdad()
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
