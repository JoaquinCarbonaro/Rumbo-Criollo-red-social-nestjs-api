import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

//estructura esperada para recibir las fechas desde el querystring
interface FechasQuery {
  desde?: string;
  hasta?: string;
}

@Injectable()
export class ValidarFechasPipe implements PipeTransform {
  //valido que las fechas existan, sean validas y mantengan un orden correcto
  transform(value: FechasQuery): Required<FechasQuery> {
    //obtengo las fechas recibidas o asigno cadena vacia si no vienen
    const desde = value?.desde ?? '';
    const hasta = value?.hasta ?? '';

    //si falta alguna fecha retorno error de peticion
    if (!desde || !hasta) {
      throw new BadRequestException('debe enviar las fechas desde y hasta');
    }

    //convierto las cadenas a objetos date para validarlas
    const fechaDesde = new Date(desde);
    const fechaHasta = new Date(hasta);

    //si alguna de las fechas no es valida retorno error
    if (Number.isNaN(fechaDesde.getTime()) || Number.isNaN(fechaHasta.getTime())) {
      throw new BadRequestException('las fechas enviadas no son validas');
    }

    //si el rango no tiene sentido logico retorno error
    if (fechaDesde > fechaHasta) {
      throw new BadRequestException('la fecha desde no puede ser mayor que la fecha hasta');
    }

    //si todo esta correcto devuelvo las fechas garantizando que existan ambas
    return { desde, hasta };
  }
}
