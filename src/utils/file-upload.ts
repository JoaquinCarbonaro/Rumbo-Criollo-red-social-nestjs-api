import { BadRequestException } from '@nestjs/common';
import type { Express } from 'express';

const TIPOS_IMAGEN_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
];

const MENSAJE_TIPO_INVALIDO = 'solo se permiten imagenes png, jpg, jpeg, webp o gif';

export function esTipoImagenValido(mimeType: string) {
  const esValido = TIPOS_IMAGEN_PERMITIDOS.includes(mimeType);
  return esValido;
}

export function validarImagenMulter(
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) {
  const esValido = esTipoImagenValido(file.mimetype);
  if (!esValido) {
    cb(new BadRequestException(MENSAJE_TIPO_INVALIDO), false);
    return;
  }
  cb(null, true);
}

export const MENSAJE_IMAGEN_INVALIDA = MENSAJE_TIPO_INVALIDO;
