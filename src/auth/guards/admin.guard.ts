import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Request } from 'express'
import { AuthPayload } from '../auth.service'

@Injectable()
export class AdminGuard implements CanActivate {
  //metodo principal que determina si la request puede continuar
  canActivate(context: ExecutionContext): boolean {
    //obtengo el contexto http de la request actual
    const http = context.switchToHttp()
    //extraigo el objeto request con el payload del usuario autenticado
    const request = http.getRequest<Request & { user?: AuthPayload }>()
    //recupero los datos del usuario desde el token decodificado
    const usuario = request.user

    //si existe el usuario y su perfil es administrador permito el acceso
    if (usuario && usuario.perfil === 'administrador') {
      return true
    }

    //si no es administrador lanzo un error 403
    throw new ForbiddenException('solo administradores pueden acceder')
  }
}
