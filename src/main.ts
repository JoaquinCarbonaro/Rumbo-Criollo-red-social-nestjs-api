import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  

//comentario: imprime ip publica del servidor render
async function showPublicIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    console.log('IP PUBLICA DE RENDER:', data.ip);
  } catch (err) {
    console.error('error obteniendo ip:', err);
  }
}
await showPublicIp();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

