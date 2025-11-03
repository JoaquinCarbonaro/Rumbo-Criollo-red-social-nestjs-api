import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { validarImagenMulter } from '../utils/file-upload';

//defino la ruta donde guardo las imagenes subidas
const uploadRoot = join(process.cwd(), 'public', 'images');

@Module({
  imports: [
    //importo el modulo de usuarios para acceder al modelo y servicio
    UsuariosModule,

    //configuro multer para subir imagenes a public/images
    MulterModule.register({
      storage: diskStorage({
        //guardo los archivos en la carpeta public/images
        destination(req, file, cb) {
          cb(null, uploadRoot);
        },
        //asigno nombre unico con timestamp y nombre original
        filename(req, file, cb) {
          const nombre = `${Date.now()}-${file.originalname}`;
          cb(null, nombre);
        },
      }),
      fileFilter: validarImagenMulter,
    }),

    //configuro el modulo jwt usando variables de entorno
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        //obtengo el secreto desde el .env o uso uno por defecto
        const secreto = configService.get<string>('JWT_SECRET') ?? 'cambia-este-secreto';
        //defino el tiempo de expiracion del token en 15 minutos
        return {
          secret: secreto,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  //registro el controlador para manejar rutas de auth
  controllers: [AuthController],
  //registro el servicio que contiene la logica de autenticacion
  providers: [AuthService],
  //exporto el servicio para que otros modulos puedan usarlo
  exports: [AuthService],
})
export class AuthModule {}
