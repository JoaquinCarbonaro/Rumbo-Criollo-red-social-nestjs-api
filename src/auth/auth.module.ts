import { forwardRef, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { MulterModule } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { join } from 'path'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { UsuariosModule } from '../usuarios/usuarios.module'
import { validarImagenMulter } from '../utils/file-upload'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { AdminGuard } from './guards/admin.guard'

//defino la ruta donde se guardan las imagenes subidas por los usuarios
const uploadRoot = join(process.cwd(), 'public', 'images')

@Module({
  imports: [
    //uso forwardref para evitar el ciclo de dependencias con usuariosmodule
    forwardRef(() => UsuariosModule),

    //configuro multer para manejar la subida de imagenes al servidor
    MulterModule.register({
      storage: diskStorage({
        //defino la carpeta destino donde se guardan las imagenes
        destination(req, file, cb) {
          cb(null, uploadRoot)
        },
        //defino el nombre del archivo combinando timestamp y nombre original
        filename(req, file, cb) {
          const nombre = `${Date.now()}-${file.originalname}`
          cb(null, nombre)
        },
      }),
      //valido que el archivo subido sea una imagen valida
      fileFilter: validarImagenMulter,
    }),

    //configuro el modulo jwt leyendo los valores del archivo .env
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        //obtengo el secreto del token o uso uno por defecto si no existe
        const secreto =
          configService.get<string>('JWT_SECRET') ?? 'cambia-este-secreto'
        return {
          //asigno el secreto al token
          secret: secreto,
          //defino el tiempo de expiracion del token a 15 minutos
          signOptions: { expiresIn: '15m' },
          
          //descomentar para prueba de token rapida
          //signOptions: { expiresIn: '6m' },
        }
      },
    }),
  ],

  //registro el controlador de autenticacion que maneja las rutas http
  controllers: [AuthController],

  //registro los servicios y guards relacionados a autenticacion
  providers: [AuthService, JwtAuthGuard, AdminGuard],

  //exporto el servicio y el guard para que otros modulos puedan usarlos
  exports: [AuthService, JwtAuthGuard, AdminGuard],
})
//defino el modulo de autenticacion que gestiona login, registro y validacion jwt
export class AuthModule {}
