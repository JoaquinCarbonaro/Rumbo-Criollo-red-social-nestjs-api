import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MulterModule } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { join } from 'path'
import { Usuario, UsuarioSchema } from './schemas/usuario.schema'
import { UsuariosService } from './usuarios.service'
import { UsuariosController } from './usuarios.controller'
import { validarImagenMulter } from '../utils/file-upload'
import { AuthModule } from '../auth/auth.module'
import { PublicacionesModule } from '../publicaciones/publicaciones.module'

//defino la ruta donde se guardan las imagenes de perfil de los usuarios
const uploadRoot = join(process.cwd(), 'public', 'images')

@Module({
  imports: [
    //importo el modulo de autenticacion con forwardref para evitar ciclo de dependencias
    forwardRef(() => AuthModule),

    //importo el modulo de publicaciones con forwardref para evitar otro ciclo de dependencias
    forwardRef(() => PublicacionesModule),

    //registro el modelo de mongoose para la coleccion usuarios
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),

    //configuro multer para manejar la subida de imagenes de perfil
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
      //valido que solo se suban archivos de imagen validos
      fileFilter: validarImagenMulter,
    }),
  ],

  //registro el servicio que contiene la logica de usuarios
  providers: [UsuariosService],

  //registro el controlador que maneja las rutas http de usuarios
  controllers: [UsuariosController],

  //exporto el servicio para que otros modulos puedan usarlo
  exports: [UsuariosService],
})
//defino el modulo de usuarios que agrupa controlador, servicio y configuraciones
export class UsuariosModule {}
