import { forwardRef, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { MulterModule } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { join } from 'path'
import { UsuariosModule } from '../usuarios/usuarios.module'
import { AuthModule } from '../auth/auth.module'
import { validarImagenMulter } from '../utils/file-upload'
import { PublicacionesController } from './publicaciones.controller'
import { PublicacionesService } from './publicaciones.service'
import { Publicacion, PublicacionSchema } from './schemas/publicacion.schema'

//defino la ruta donde se guardan las imagenes de las publicaciones
const uploadRoot = join(process.cwd(), 'public', 'images')

@Module({
  imports: [
    //registro el modelo de mongoose para la coleccion publicaciones
    MongooseModule.forFeature([
      { name: Publicacion.name, schema: PublicacionSchema },
    ]),

    //importo el modulo de usuarios usando forwardref para evitar ciclo de dependencias
    forwardRef(() => UsuariosModule),

    //importo el modulo de autenticacion tambien con forwardref
    forwardRef(() => AuthModule),

    //configuro multer para manejar la subida de imagenes de publicaciones
    MulterModule.register({
      storage: diskStorage({
        //defino la carpeta donde se guardan las imagenes
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
  ],

  //registro el controlador que maneja las rutas http del modulo publicaciones
  controllers: [PublicacionesController],

  //registro el servicio con la logica principal del modulo publicaciones
  providers: [PublicacionesService],

  //exporto el servicio para que otros modulos puedan usarlo
  exports: [PublicacionesService],
})
//defino el modulo de publicaciones que agrupa controlador, servicio y configuraciones
export class PublicacionesModule {}
