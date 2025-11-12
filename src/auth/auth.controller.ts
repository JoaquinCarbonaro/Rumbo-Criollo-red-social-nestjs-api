import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
  Req,
  Get,
  Headers as ReqHeaders,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Express } from 'express';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  //registro un nuevo usuario
  @Post('registro')
  @UseInterceptors(FileInterceptor('imagenPerfil')) //intercepto el archivo imagenPerfil enviado en el formdata
  @HttpCode(HttpStatus.CREATED)
  registrar(
    @UploadedFile() imagenPerfil: Express.Multer.File,
    @Body() createUsuarioDto: CreateUsuarioDto & { imagenPerfil?: string },
    @Req() _req: Request,
  ) {
    //si se recibe una imagen, guardo su ruta relativa
    if (imagenPerfil) {
      createUsuarioDto.imagenPerfil = `/images/${imagenPerfil.filename}`;
    }

    //llamo al servicio para registrar el usuario
    return this.authService.registrar(createUsuarioDto);
  }

  //realizo login y devuelvo el token jwt
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginAuthDto: LoginAuthDto) {
    //llamo al servicio para validar credenciales
    return this.authService.login(loginAuthDto);
  }

  //verifico el token enviado en el header authorization
  @Post('autorizar')
  @HttpCode(HttpStatus.OK)
  autorizar(@ReqHeaders('authorization') authorization?: string) {
    //valido el token usando el servicio
    const payload = this.authService.validarToken(authorization);
    //retorno respuesta con datos del usuario sin informacion de expiracion
    return { autorizado: true, usuario: payload };
  }

  //renuevo un token valido y extiendo su expiracion quince minutos mas
  @Post('refrescar')
  @HttpCode(HttpStatus.OK)
  refrescar(@ReqHeaders('authorization') authorization?: string) {
    return this.authService.refrescarToken(authorization);
  }
}
