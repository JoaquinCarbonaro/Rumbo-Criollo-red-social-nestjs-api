import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  //creo la app como NestExpressApplication para poder servir archivos estaticos
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  //aplico validaciones globales a todos los dto
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //elimino campos no declarados en el dto
      forbidNonWhitelisted: true, //lanzo error si se envia algo no permitido
      transform: true, //transformo tipos automaticamente
    }),
  );

  //habilito cors para permitir peticiones desde el front
  app.enableCors();

  //verifico que exista la carpeta public/images y la creo si no esta
  const imagesPath = join(process.cwd(), 'public', 'images');
  if (!existsSync(imagesPath)) {
    mkdirSync(imagesPath, { recursive: true });
  }

  //expongo la carpeta public para acceder a imagenes por ruta /images/*
  app.useStaticAssets(join(__dirname, '..', 'public'));

  //inicio el servidor en el puerto definido o en 3000 por defecto
  await app.listen(process.env.PORT ?? 3000);
}

//ejecuto la funcion principal
bootstrap();
