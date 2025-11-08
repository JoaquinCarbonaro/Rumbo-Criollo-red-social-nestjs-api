import {
  Controller,
  Get,
  Put,
  Req,
  Body,
  UseGuards,
  NotFoundException,
  Inject,
  forwardRef,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common'
import type { Request, Express } from 'express'
import { FileInterceptor } from '@nestjs/platform-express'
import { UsuariosService } from './usuarios.service'
import { PublicacionesService } from '../publicaciones/publicaciones.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto'

//formateo la fecha respetando la zona horaria local y evito el desfase de toisostring
function formatearFechaLocalPlano(fecha: Date | null | undefined): string | null {
  if (!fecha) return null
  const year = fecha.getFullYear()
  const month = `${fecha.getMonth() + 1}`.padStart(2, '0')
  const day = `${fecha.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

@Controller('usuarios')
export class UsuariosController {
  //inyecto los servicios necesarios para manejar usuarios y publicaciones
  constructor(
    private readonly usuariosService: UsuariosService,

    //uso forwardref para evitar ciclo de dependencias con publicacionesservice
    @Inject(forwardRef(() => PublicacionesService))
    private readonly publicacionesService: PublicacionesService
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

    //armo el objeto publico que envio al front con solo los campos necesarios
    const usuarioPublico = {
      uuid: usuario.uuid,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      userName: usuario.userName,
      email: usuario.email,
      //formateo la fecha en formato yyyy-mm-dd sin desfase horario
      fechaNacimiento: formatearFechaLocalPlano(usuario.fechaNacimiento),
      descripcion: usuario.descripcion,
      imagenPerfil: usuario.imagenPerfil ?? null
    }

    //busco todas las publicaciones creadas por este usuario
    const publicaciones = await this.publicacionesService.findByAutor(usuario._id)

    //ordeno las publicaciones por fecha descendente de mas reciente a mas antigua
    const ordenadas = [...publicaciones].sort((a, b) => {
      const fechaA = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const fechaB = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return fechaB - fechaA
    })

    //me quedo con las 3 publicaciones mas recientes para la vista de perfil
    const ultimas = ordenadas.slice(0, 3)

    //devuelvo el perfil del usuario junto con sus ultimas publicaciones
    return { usuario: usuarioPublico, publicaciones: ultimas }
  }

  //ruta protegida para actualizar el perfil del usuario autenticado
  @UseGuards(JwtAuthGuard)
  @Put('mi-perfil')
  @UseInterceptors(FileInterceptor('imagenPerfil'))
  async actualizarMiPerfil(
    @Req() req: Request,
    @Body() body: ActualizarUsuarioDto,
    @UploadedFile() imagenPerfil?: Express.Multer.File
  ) {
    //obtengo los datos del usuario desde el token jwt
    const usuarioJwt = (req as any).user

    //si el token no tiene uuid lanzo error de usuario no encontrado
    if (!usuarioJwt || !usuarioJwt.uuid) {
      throw new NotFoundException('usuario no encontrado')
    }

    //actualizo el perfil usando el uuid del usuario autenticado
    const usuarioActualizado = await this.usuariosService.actualizarPerfil(
      usuarioJwt.uuid,
      body,
      imagenPerfil
    )

    //normalizo la respuesta al mismo formato que uso en obtenermiperfil
    const usuarioPublico = {
      uuid: usuarioActualizado.uuid,
      nombre: usuarioActualizado.nombre,
      apellido: usuarioActualizado.apellido,
      userName: usuarioActualizado.userName,
      email: usuarioActualizado.email,
      fechaNacimiento: formatearFechaLocalPlano(usuarioActualizado.fechaNacimiento),
      descripcion: usuarioActualizado.descripcion,
      imagenPerfil: usuarioActualizado.imagenPerfil ?? null
    }

    //devuelvo solo el usuario para que el front actualice el estado del perfil
    return { usuario: usuarioPublico }
  }
}
