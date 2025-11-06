import {
  Controller,
  Get,
  Req,
  UseGuards,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common'
import type { Request } from 'express'
import { UsuariosService } from './usuarios.service'
import { PublicacionesService } from '../publicaciones/publicaciones.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('usuarios')
export class UsuariosController {
  //inyecto los servicios necesarios para manejar usuarios y publicaciones
  constructor(
    private readonly usuariosService: UsuariosService,

    //uso forwardref para evitar ciclo de dependencias con publicacionesservice
    @Inject(forwardRef(() => PublicacionesService))
    private readonly publicacionesService: PublicacionesService,
  ) {}

  //ruta protegida que devuelve el perfil del usuario autenticado junto a sus publicaciones
  @UseGuards(JwtAuthGuard)
  @Get('mi-perfil')
  async obtenerMiPerfil(@Req() req: Request) {
    //extraigo los datos del usuario desde el token jwt
    const usuarioJwt = (req as any).user

    //si el token no tiene uuid lanzo error
    if (!usuarioJwt || !usuarioJwt.uuid) {
      throw new NotFoundException('usuario no encontrado')
    }

    //busco el usuario real en base de datos usando su uuid
    const usuario = await this.usuariosService.findByUuid(usuarioJwt.uuid)
    if (!usuario) {
      throw new NotFoundException('usuario no encontrado')
    }

    //armo el objeto publico que se enviara al front
    //incluyo solo los campos necesarios para la vista de perfil
    const usuarioPublico = {
      uuid: usuario.uuid,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      userName: usuario.userName,
      email: usuario.email,
      // convierto la fecha a formato plano YYYY-MM-DD para evitar desfase horario
      fechaNacimiento: usuario.fechaNacimiento
        ? usuario.fechaNacimiento.toISOString().split('T')[0]
        : null,
      descripcion: usuario.descripcion,
      imagenPerfil: usuario.imagenPerfil ?? null,
    }

    //busco todas las publicaciones creadas por este usuario
    const publicaciones = await this.publicacionesService.findByAutor(usuario._id)

    //ordeno las publicaciones por fecha descendente (de mas reciente a mas antigua)
    const ordenadas = [...publicaciones].sort((a, b) => {
      const fechaA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const fechaB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return fechaB - fechaA
    })

    //me quedo con las 3 publicaciones mas recientes
    const ultimas = ordenadas.slice(0, 3)

    //devuelvo el perfil del usuario junto con sus ultimas publicaciones
    return { usuario: usuarioPublico, publicaciones: ultimas }
  }
}
