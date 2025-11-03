import { BadRequestException } from '@nestjs/common';

//defino los tipos mime permitidos para subir imagenes
const TIPOS_IMAGEN_PERMITIDOS = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
];

//mensaje que se muestra si el tipo de archivo no es valido
const MENSAJE_TIPO_INVALIDO = 'solo se permiten imagenes png, jpg, jpeg, webp o gif';

//funcion que verifica si el tipo mime recibido pertenece a los permitidos
export function esTipoImagenValido(mimeType: string) {
  const esValido = TIPOS_IMAGEN_PERMITIDOS.includes(mimeType);
  return esValido;
}

//funcion usada por multer para validar archivos antes de guardarlos
export function validarImagenMulter(
  _req: unknown, //request no usado
  file: Express.Multer.File, //archivo recibido
  cb: (error: Error | null, acceptFile: boolean) => void, //callback de validacion
) {
  //verifico si el tipo mime del archivo es valido
  const esValido = esTipoImagenValido(file.mimetype);
  //si el tipo no es valido, rechazo el archivo y devuelvo error
  if (!esValido) {
    cb(new BadRequestException(MENSAJE_TIPO_INVALIDO), false);
    return;
  }
  //si es valido, acepto el archivo
  cb(null, true);
}

//reutilizo el mismo mensaje de error para mantener consistencia en el proyecto
export const MENSAJE_IMAGEN_INVALIDA = MENSAJE_TIPO_INVALIDO;
