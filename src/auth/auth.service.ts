import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUsuarioDto } from '../usuarios/dto/create-usuario.dto';
import { obtenerFechaNacimientoValidada } from '../utils/date-validators';
import { UsuariosService } from '../usuarios/usuarios.service';
import { LoginAuthDto } from './dto/login-auth.dto';

//defino la estructura base del payload que guardo en el token jwt
export interface AuthPayload {
  uuid: string;
  perfil: string;
  email: string;
  userName: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

@Injectable()
export class AuthService {
  constructor(
    //uso el servicio de usuarios para crear buscar y comparar contrasenas
    private readonly usuariosService: UsuariosService,
    //uso el servicio jwt para firmar y verificar tokens
    private readonly jwtService: JwtService,
  ) {}

  //registro un nuevo usuario y devuelvo su token
  async registrar(createUsuarioDto: CreateUsuarioDto) {
    //valido la fecha de nacimiento antes de crear el usuario
    obtenerFechaNacimientoValidada(createUsuarioDto.fechaNacimiento);

    //fuerzo el perfil usuario por defecto si no viene definido
    const datosParaCrear: CreateUsuarioDto & { imagenPerfil?: string } = {
      ...createUsuarioDto,
      perfil: createUsuarioDto.perfil ?? 'usuario',
    };

    //creo el usuario en la base de datos
    const usuario = await this.usuariosService.create(
      datosParaCrear as CreateUsuarioDto,
    );

    //limpio datos sensibles antes de devolver el usuario
    const usuarioPublico = this.usuariosService.toPublic(usuario);

    //genero el token jwt con datos minimos del usuario
    const token = this.crearToken(usuarioPublico.uuid, usuarioPublico.perfil, {
      email: usuarioPublico.email,
      userName: usuarioPublico.userName,
    });

    //devuelvo mensaje usuario y token
    return {
      mensaje: 'registro completado',
      usuario: usuarioPublico,
      token,
    };
  }

  //valido credenciales y genero token al iniciar sesion
  async login(loginAuthDto: LoginAuthDto) {
    //obtengo username o email segun lo que haya enviado el cliente
    const username = loginAuthDto.userName ?? loginAuthDto.userName;
    //valido que haya enviado al menos email o username
    if (!loginAuthDto.email && !username) {
      throw new BadRequestException('debe enviar email o nombre de usuario');
    }

    //busco al usuario por email o username
    const usuario = await this.usuariosService.findByEmailOrUserName({
      email: loginAuthDto.email,
      userName: username,
    });
    //si no encuentro usuario lanzo error de credenciales
    if (!usuario) {
      throw new UnauthorizedException('credenciales invalidas');
    }

    //verifico que la cuenta no este deshabilitada
    if (usuario.estado === false) {
      throw new UnauthorizedException('la cuenta esta deshabilitada');
    }

    //comparo la contrasena enviada con la guardada en base de datos
    const passwordValido = await this.usuariosService.compararPassword(
      loginAuthDto.password,
      usuario.password,
    );
    //si la contrasena no coincide lanzo error de credenciales
    if (!passwordValido) {
      throw new UnauthorizedException('credenciales invalidas');
    }

    //elimino datos sensibles y creo el token para el usuario
    const usuarioPublico = this.usuariosService.toPublic(usuario);
    const token = this.crearToken(usuarioPublico.uuid, usuarioPublico.perfil, {
      email: usuarioPublico.email,
      userName: usuarioPublico.userName,
    });

    //devuelvo mensaje usuario y token
    return {
      mensaje: 'login correcto',
      usuario: usuarioPublico,
      token,
    };
  }

  //valido el token recibido en el header authorization
  validarToken(authorization?: string): AuthPayload {
    //extraigo el token crudo del header
    const token = this.extraerTokenDesdeHeader(authorization);
    try {
      //verifico que el token sea valido y no haya expirado
      const payload = this.jwtService.verify<AuthPayload>(token);
      //retorno el payload tipado para usarlo en el resto de la app
      return payload;
    } catch {
      //si falla la verificacion considero el token invalido o vencido
      throw new UnauthorizedException('token invalido o expirado');
    }
  }

  //refresco un token vigente generando uno nuevo con la misma informacion
  refrescarToken(authorization?: string) {
    //extraigo el token actual desde el header
    const token = this.extraerTokenDesdeHeader(authorization);
    try {
      //verifico el token y obtengo su payload
      const payload = this.jwtService.verify<AuthPayload>(token);
      //valido que el payload tenga los datos minimos obligatorios
      if (!payload.uuid || !payload.perfil) {
        throw new UnauthorizedException('token sin datos obligatorios');
      }
      //creo un nuevo token reutilizando los datos del payload original
      const nuevoToken = this.crearToken(payload.uuid, payload.perfil, {
        email: typeof payload.email === 'string' ? payload.email : '',
        userName: typeof payload.userName === 'string' ? payload.userName : '',
      });
      //devuelvo mensaje token renovado y datos del usuario
      return {
        mensaje: 'token renovado',
        token: nuevoToken,
        usuario: payload,
      };
    } catch {
      //si falla la verificacion considero el token invalido o expirado
      throw new UnauthorizedException('token invalido o expirado');
    }
  }

  //creo el token jwt con el payload personalizado
  private crearToken(
    uuid: string,
    perfil: string,
    datosContacto: { email: string; userName: string },
  ) {
    //armo el payload con los datos basicos del usuario
    const payload = {
      uuid,
      perfil,
      email: datosContacto.email,
      userName: datosContacto.userName,
    };
    //firmo el token con el secreto y la configuracion definida en el modulo jwt
    const token = this.jwtService.sign(payload);
    //retorno el token firmado listo para enviar al cliente
    return token;
  }

  //extraigo el token del header siguiendo el formato bearer
  private extraerTokenDesdeHeader(authorization?: string) {
    //si no se envio el header lanzo error de autorizacion
    if (!authorization) {
      throw new UnauthorizedException('token no enviado');
    }
    //separo esquema y token usando el espacio como delimitador
    const partes = authorization.split(' ');
    const esquema = partes[0];
    const token = partes[1];

    //valido que el formato sea bearer token
    if (esquema !== 'Bearer' || !token) {
      throw new UnauthorizedException('formato de autorizacion invalido');
    }

    //retorno el token limpio para poder verificarlo
    return token;
  }
}
