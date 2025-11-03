import { BadRequestException } from '@nestjs/common';
import { ValidationOptions, registerDecorator } from 'class-validator';

export const MENSAJE_FECHA_INVALIDA = 'la fecha de nacimiento no es valida';
export const MENSAJE_FECHA_FUTURA =
  'la fecha de nacimiento no puede ser posterior a la fecha actual';
export const MENSAJE_MAYOR_EDAD = 'el usuario debe ser mayor de edad';

function normalizarFecha(fecha: Date) {
  const normalizada = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  return normalizada;
}

export function esFechaTextoValida(fechaTexto: string) {
  if (!fechaTexto) {
    return false;
  }
  const fecha = new Date(fechaTexto);
  const esValida = Number.isNaN(fecha.getTime()) === false;
  return esValida;
}

export function calcularEdad(fechaNacimiento: Date, fechaReferencia: Date) {
  const diferenciaAnio = fechaReferencia.getFullYear() - fechaNacimiento.getFullYear();
  const mesReferencia = fechaReferencia.getMonth();
  const diaReferencia = fechaReferencia.getDate();
  const mesNacimiento = fechaNacimiento.getMonth();
  const diaNacimiento = fechaNacimiento.getDate();
  const yaCumplio =
    mesReferencia > mesNacimiento ||
    (mesReferencia === mesNacimiento && diaReferencia >= diaNacimiento);
  const edad = yaCumplio ? diferenciaAnio : diferenciaAnio - 1;
  return edad;
}

export function esFechaFutura(fecha: Date, referencia: Date) {
  const fechaNormalizada = normalizarFecha(fecha);
  const referenciaNormalizada = normalizarFecha(referencia);
  const esFutura = fechaNormalizada.getTime() > referenciaNormalizada.getTime();
  return esFutura;
}

export function tieneEdadMinima(fechaNacimiento: Date, referencia: Date) {
  const edad = calcularEdad(fechaNacimiento, referencia);
  return edad >= 18;
}

export function obtenerFechaNacimientoValidada(fechaTexto: string) {
  if (!esFechaTextoValida(fechaTexto)) {
    throw new BadRequestException(MENSAJE_FECHA_INVALIDA);
  }
  const fecha = new Date(fechaTexto);
  const fechaNormalizada = normalizarFecha(fecha);
  const hoy = normalizarFecha(new Date());
  if (esFechaFutura(fechaNormalizada, hoy)) {
    throw new BadRequestException(MENSAJE_FECHA_FUTURA);
  }
  if (!tieneEdadMinima(fechaNormalizada, hoy)) {
    throw new BadRequestException(MENSAJE_MAYOR_EDAD);
  }
  return fechaNormalizada;
}

export function validarFechaNacimiento(fecha: Date) {
  const fechaNormalizada = normalizarFecha(fecha);
  const esValida = Number.isNaN(fechaNormalizada.getTime()) === false;
  if (!esValida) {
    throw new BadRequestException(MENSAJE_FECHA_INVALIDA);
  }
  const hoy = normalizarFecha(new Date());
  if (esFechaFutura(fechaNormalizada, hoy)) {
    throw new BadRequestException(MENSAJE_FECHA_FUTURA);
  }
  if (!tieneEdadMinima(fechaNormalizada, hoy)) {
    throw new BadRequestException(MENSAJE_MAYOR_EDAD);
  }
}

export function IsFechaNoFutura(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'IsFechaNoFutura',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (!esFechaTextoValida(value)) {
            return false;
          }
          const fecha = new Date(value);
          const hoy = normalizarFecha(new Date());
          const esFutura = esFechaFutura(fecha, hoy);
          return esFutura === false;
        },
        defaultMessage() {
          return MENSAJE_FECHA_FUTURA;
        },
      },
    });
  };
}

export function IsMayorDeEdad(validationOptions?: ValidationOptions) {
  return function (object: Record<string, any>, propertyName: string) {
    registerDecorator({
      name: 'IsMayorDeEdad',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (!esFechaTextoValida(value)) {
            return false;
          }
          const fecha = new Date(value);
          const hoy = normalizarFecha(new Date());
          const esMayor = tieneEdadMinima(fecha, hoy);
          return esMayor;
        },
        defaultMessage() {
          return MENSAJE_MAYOR_EDAD;
        },
      },
    });
  };
}
