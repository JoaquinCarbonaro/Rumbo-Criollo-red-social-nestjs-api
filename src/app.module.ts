import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    //cargo las variables de entorno y las hago globales
    ConfigModule.forRoot({ isGlobal: true }),

    //configuro conexion a mongodb usando la uri del .env
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        //obtengo la uri de mongo o uso la local si no existe
        const uri =
          configService.get<string>('MONGO_URI') ??
          'mongodb://localhost:27017/rumbo_criollo';
        //retorno el objeto con la uri para mongoose
        return { uri };
      },
    }),

    //importo modulos principales del proyecto
    UsuariosModule,
    AuthModule,
  ],
  //registro controlador principal
  controllers: [AppController],
  //registro servicio principal
  providers: [AppService],
})
export class AppModule {}
