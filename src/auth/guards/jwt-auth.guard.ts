import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Request } from 'express'
import { AuthPayload, AuthService } from '../auth.service'

//guard que valida el token jwt y adjunta los datos del usuario a la request
@Injectable()
export class JwtAuthGuard implements CanActivate {
  //inyecto el servicio de autenticacion para validar tokens
  constructor(private readonly authService: AuthService) {}

  //metodo principal que determina si la solicitud puede continuar
  canActivate(context: ExecutionContext): boolean {
    //obtengo el contexto http de la peticion
    const http = context.switchToHttp()
    //obtengo el objeto request y agrego tipo extendido para incluir user
    const request = http.getRequest<Request & { user?: AuthPayload }>()

    //extraigo el header authorization de la peticion
    const authorization = request.headers.authorization
    //si el header no existe o no es valido lanzo excepcion
    if (typeof authorization !== 'string') {
      throw new UnauthorizedException('token no enviado')
    }

    //valido el token jwt usando el servicio de autenticacion
    const payload = this.authService.validarToken(authorization)

    //creo el objeto usuario con los datos obtenidos del token
    const usuario: AuthPayload = {
      uuid: payload.uuid,
      perfil: payload.perfil,
      email: payload.email,
      userName: payload.userName,
    }

    //adjunto el usuario a la request para que pueda usarse en los controladores
    request.user = usuario

    //retorno true para permitir el acceso a la ruta
    return true
  }
}
