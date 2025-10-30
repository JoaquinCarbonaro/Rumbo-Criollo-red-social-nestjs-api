import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginAuthDto {
  //permito iniciar sesion usando correo electronico
  @IsEmail()
  @IsOptional()
  email?: string;

  //permito iniciar sesion usando nombre de usuario
  @IsString()
  @IsOptional()
  userName?: string;

  //valido que la contraseña sea obligatoria y tenga minimo 8 caracteres
  @IsString()
  @IsNotEmpty({ message: 'la contraseña es obligatoria' })
  @MinLength(8, { message: 'la contraseña debe tener al menos 8 caracteres' })
  password!: string;
}
