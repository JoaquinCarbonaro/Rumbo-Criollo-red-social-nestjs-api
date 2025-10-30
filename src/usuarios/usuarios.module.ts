import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Usuario, UsuarioSchema } from './schemas/usuario.schema';
import { UsuariosService } from './usuarios.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';

//defino la ruta donde guardo las imagenes subidas
const uploadRoot = join(process.cwd(), 'public', 'images');

@Module({
  imports: [
    //registro el modelo de mongoose para la coleccion usuarios
    MongooseModule.forFeature([{ name: Usuario.name, schema: UsuarioSchema }]),

    //configuro multer para manejar subida de archivos
    MulterModule.register({
      storage: diskStorage({
        //guardo los archivos en la carpeta public/images
        destination(req, file, cb) {
          cb(null, uploadRoot);
        },
        //asigno un nombre unico usando timestamp
        filename(req, file, cb) {
          const nombre = `${Date.now()}-${file.originalname}`;
          cb(null, nombre);
        },
      }),
    }),
  ],
  //declaro el servicio de usuarios disponible en el modulo
  providers: [UsuariosService],
  //exporto el servicio para que otros modulos puedan usarlo
  exports: [UsuariosService],
})
export class UsuariosModule {}
