import { BadRequestException } from '@nestjs/common';
import { ValidationOptions, registerDecorator } from 'class-validator';

//mensajes de error usados para las validaciones de fecha
export const MENSAJE_FECHA_INVALIDA = 'la fecha de nacimiento no es valida';
export const MENSAJE_FECHA_FUTURA =
  'la fecha de nacimiento no puede ser posterior a la fecha actual';
export const MENSAJE_MAYOR_EDAD = 'el usuario debe ser mayor de edad';

//funcion para quitar la hora de una fecha y quedarme solo con dia, mes y anio
function normalizarFecha(fecha: Date) {
  const normalizada = new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
  );
  return normalizada;
}

//parsea un texto en formato YYYY-MM-DD a una fecha local segura
function parsearFechaLocal(fechaTexto: string): Date | null {
  if (!fechaTexto) {
    return null;
  }

  const trimmed = fechaTexto.trim();

  //espero formato YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }

  //importante: uso fecha local, no iso string
  const fecha = new Date(year, month - 1, day);

  if (Number.isNaN(fecha.getTime())) {
    return null;
  }

  //verificacion extra para evitar fechas invalidas tipo 31/02
  if (
    fecha.getFullYear() !== year ||
    fecha.getMonth() !== month - 1 ||
    fecha.getDate() !== day
  ) {
    return null;
  }

  return fecha;
}

//verifico si un texto se puede convertir en una fecha valida
export function esFechaTextoValida(fechaTexto: string) {
  const fecha = parsearFechaLocal(fechaTexto);
  return fecha !== null;
}

//calculo la edad de una persona segun la fecha de nacimiento y una fecha de referencia
export function calcularEdad(fechaNacimiento: Date, fechaReferencia: Date) {
  const diferenciaAnio =
    fechaReferencia.getFullYear() - fechaNacimiento.getFullYear();
  const mesReferencia = fechaReferencia.getMonth();
  const diaReferencia = fechaReferencia.getDate();
  const mesNacimiento = fechaNacimiento.getMonth();
  const diaNacimiento = fechaNacimiento.getDate();
  //verifico si ya cumplio anios este anio
  const yaCumplio =
    mesReferencia > mesNacimiento ||
    (mesReferencia === mesNacimiento && diaReferencia >= diaNacimiento);
  const edad = yaCumplio ? diferenciaAnio : diferenciaAnio - 1;
  return edad;
}

//compruebo si una fecha es futura en relacion a otra
export function esFechaFutura(fecha: Date, referencia: Date) {
  const fechaNormalizada = normalizarFecha(fecha);
  const referenciaNormalizada = normalizarFecha(referencia);
  const esFutura = fechaNormalizada.getTime() > referenciaNormalizada.getTime();
  return esFutura;
}

//verifico si la persona tiene al menos 18 anios
export function tieneEdadMinima(fechaNacimiento: Date, referencia: Date) {
  const edad = calcularEdad(fechaNacimiento, referencia);
  return edad >= 18;
}

//valido un texto recibido como fecha y lanzo excepciones si hay errores
export function obtenerFechaNacimientoValidada(fechaTexto: string) {
  //intento convertir el texto a una fecha local
  const fecha = parsearFechaLocal(fechaTexto);

  //si no es un texto de fecha valido lanzo error
  if (!fecha) {
    throw new BadRequestException(MENSAJE_FECHA_INVALIDA);
  }

  //normalizo la fecha recibida y la fecha de hoy a solo dia, mes y anio
  const fechaNormalizada = normalizarFecha(fecha);
  const hoy = normalizarFecha(new Date());

  //si la fecha es futura lanzo error
  if (esFechaFutura(fechaNormalizada, hoy)) {
    throw new BadRequestException(MENSAJE_FECHA_FUTURA);
  }

  //si no cumple la edad minima lanzo error
  if (!tieneEdadMinima(fechaNormalizada, hoy)) {
    throw new BadRequestException(MENSAJE_MAYOR_EDAD);
  }

  //si todo esta bien retorno la fecha normalizada
  return fechaNormalizada;
}

//valido directamente una fecha date, no texto, y lanzo errores segun el caso
export function validarFechaNacimiento(fecha: Date) {
  const fechaNormalizada = normalizarFecha(fecha);
  const esValida = Number.isNaN(fechaNormalizada.getTime()) === false;
  //si la fecha no se puede interpretar lanzo error
  if (!esValida) {
    throw new BadRequestException(MENSAJE_FECHA_INVALIDA);
  }
  const hoy = normalizarFecha(new Date());
  //si la fecha es futura lanzo error
  if (esFechaFutura(fechaNormalizada, hoy)) {
    throw new BadRequestException(MENSAJE_FECHA_FUTURA);
  }
  //si no cumple la edad minima lanzo error
  if (!tieneEdadMinima(fechaNormalizada, hoy)) {
    throw new BadRequestException(MENSAJE_MAYOR_EDAD);
  }
}

//decorador custom que valida que la fecha no sea futura
export function IsFechaNoFutura(validationOptions?: ValidationOptions) {
  //retorno una funcion que registra el decorador en el campo del dto
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'IsFechaNoFutura',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          //intento parsear el valor recibido como fecha local
          const fecha = parsearFechaLocal(value);
          if (!fecha) {
            return false;
          }
          const hoy = normalizarFecha(new Date());
          const esFutura = esFechaFutura(fecha, hoy);
          //retorno true solo si la fecha no es futura
          return esFutura === false;
        },
        //mensaje de error por defecto
        defaultMessage() {
          return MENSAJE_FECHA_FUTURA;
        },
      },
    });
  };
}

//decorador custom que valida que el usuario sea mayor de edad
export function IsMayorDeEdad(validationOptions?: ValidationOptions) {
  //retorno una funcion que registra el decorador en el campo del dto
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'IsMayorDeEdad',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          //intento convertir el valor a fecha local
          const fecha = parsearFechaLocal(value);
          if (!fecha) {
            return false;
          }
          const hoy = normalizarFecha(new Date());
          const esMayor = tieneEdadMinima(fecha, hoy);
          //retorno true solo si cumple la edad minima
          return esMayor;
        },
        //mensaje de error por defecto
        defaultMessage() {
          return MENSAJE_MAYOR_EDAD;
        },
      },
    });
  };
}
