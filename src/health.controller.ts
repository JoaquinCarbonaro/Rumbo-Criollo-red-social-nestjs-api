import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  //inyeccion de la conexion de mongoose
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Get()
  root(){
    //respuesta minima para comprobar que el servidor corre
    return { ok: true, ts: Date.now() };
  }

  @Get('db')
  db(){
    //mapea estados de mongoose a textos
    const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' } as const;

    //obtiene estado actual
    const stateCode = this.conn.readyState as 0|1|2|3;
    const stateText = states[stateCode];

    //si no esta conectado devuelve 503
    if(stateCode !== 1){
      throw new HttpException(
        { ok: false, state: stateText },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    //si esta conectado responde ok
    return { ok: true, state: stateText };
  }
}
