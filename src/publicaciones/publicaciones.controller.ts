import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Request } from 'express'
import { AuthPayload } from '../auth/auth.service'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { validarImagenMulter } from '../utils/file-upload'
import { CreatePublicacionDto } from './dto/create-publicacion.dto'
import { CreateComentarioDto } from './dto/create-comentario.dto'
import { UpdateComentarioDto } from './dto/update-comentario.dto'
import { PublicacionesService } from './publicaciones.service'

//controlador principal para manejar las rutas de publicaciones
@Controller('publicaciones')
export class PublicacionesController {
  //inyecto el servicio de publicaciones
  constructor(private readonly publicacionesService: PublicacionesService) {}

  //ruta protegida que crea una nueva publicacion
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(
    FileInterceptor('imagen', { fileFilter: validarImagenMulter }),
  )
  crear(
    @Body() createPublicacionDto: CreatePublicacionDto,
    @Req() req: Request,
    @UploadedFile() imagen?: Express.Multer.File,
  ) {
    //extraigo el usuario autenticado desde el token
    const request = req as Request & { user?: AuthPayload }
    //si no hay usuario valido lanzo error
    if (!request.user) {
      throw new UnauthorizedException('token invalido')
    }

    //llamo al servicio para crear la publicacion
    return this.publicacionesService.crear(
      createPublicacionDto,
      request.user.uuid,
      imagen,
    )
  }

  //ruta publica para listar publicaciones con filtros y paginacion
  @Get()
  listar(
    @Query('offset') offset?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('order') order?: string,
    @Query('autorUuid') autorUuid?: string,
    @Query('autorId') autorId?: string,
    @Query('autor') autor?: string,
  ) {
    //convierto los parametros de query a numeros validos
    const offsetNumero = Number(offset)
    const offsetValido =
      Number.isFinite(offsetNumero) && offsetNumero >= 0
        ? Math.floor(offsetNumero)
        : undefined

    const paginaNumero = Number(page)
    const pagina =
      Number.isFinite(paginaNumero) && paginaNumero > 0
        ? Math.floor(paginaNumero)
        : 1

    const limiteNumero = Number(limit)
    const limite =
      Number.isFinite(limiteNumero) && limiteNumero > 0
        ? Math.floor(limiteNumero)
        : 10

    //determino el criterio de ordenamiento
    const orden = order === 'likes' ? 'likes' : 'createdAt'

    //resuelvo la referencia al autor usando uuid, id o nombre
    const autorReferencia =
      autorUuid && autorUuid !== ''
        ? autorUuid
        : autorId && autorId !== ''
        ? autorId
        : autor && autor !== ''
        ? autor
        : undefined

    //calculo el desplazamiento usando offset si viene o en base a la pagina
    const desplazamiento =
      typeof offsetValido === 'number' ? offsetValido : (pagina - 1) * limite

    //retorno la lista paginada segun los parametros
    return this.publicacionesService.listar(
      desplazamiento,
      limite,
      orden,
      autorReferencia,
    )
  }

  //ruta protegida para eliminar una publicacion
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  eliminar(@Param('id') id: string, @Req() req: Request) {
    const request = req as Request & { user?: AuthPayload }
    //valido que el usuario este autenticado
    if (!request.user) {
      throw new UnauthorizedException('token invalido')
    }

    //verifico si el usuario es administrador
    const esAdmin = request.user.perfil === 'administrador'
    //llamo al servicio para eliminar la publicacion (baja logica)
    return this.publicacionesService.eliminar(id, request.user.uuid, esAdmin)
  }

  //ruta protegida para dar me gusta a una publicacion
  @UseGuards(JwtAuthGuard)
  @Post(':id/me-gusta')
  darLike(@Param('id') id: string, @Req() req: Request) {
    const request = req as Request & { user?: AuthPayload }
    //si no hay usuario autenticado lanzo error de autorizacion
    if (!request.user) {
      throw new UnauthorizedException('token invalido')
    }

    //registro el like en el servicio
    return this.publicacionesService.darLike(id, request.user.uuid)
  }

  //ruta protegida para quitar un me gusta de una publicacion
  @UseGuards(JwtAuthGuard)
  @Delete(':id/me-gusta')
  quitarLike(@Param('id') id: string, @Req() req: Request) {
    const request = req as Request & { user?: AuthPayload }
    //si no hay usuario autenticado lanzo error de autorizacion
    if (!request.user) {
      throw new UnauthorizedException('token invalido')
    }

    //elimino el like en el servicio
    return this.publicacionesService.quitarLike(id, request.user.uuid)
  }

  //detalle completo de la publicacion
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  obtenerDetalle(@Param('id') id: string) {
    //delego en el servicio la busqueda del detalle por id
    return this.publicacionesService.obtenerDetalle(id)
  }

  //comentarios paginados ordenados por mas recientes
  @UseGuards(JwtAuthGuard)
  @Get(':id/comentarios')
  listarComentarios(
    @Param('id') id: string,
    @Query('skip') skip?: string,
    @Query('limit') limit?: string,
  ) {
    //normalizo el skip recibido para evitar valores invalidos
    const skipNumero = Number(skip)
    const skipSeguro =
      Number.isFinite(skipNumero) && skipNumero >= 0 ? Math.floor(skipNumero) : 0

    //normalizo el limite recibido para definir cuantos comentarios traer
    const limitNumero = Number(limit)
    const limiteSeguro =
      Number.isFinite(limitNumero) && limitNumero > 0 ? Math.floor(limitNumero) : 3

    //pido al servicio los comentarios paginados de la publicacion
    return this.publicacionesService.listarComentarios(id, skipSeguro, limiteSeguro)
  }

  //creo un nuevo comentario asociado a una publicacion
  @UseGuards(JwtAuthGuard)
  @Post(':id/comentarios')
  crearComentario(
    @Param('id') id: string,
    @Body() body: CreateComentarioDto,
    @Req() req: Request,
  ) {
    const request = req as Request & { user?: AuthPayload }
    //valido que el usuario este autenticado antes de comentar
    if (!request.user) {
      throw new UnauthorizedException('token invalido')
    }

    //delego en el servicio la creacion del comentario
    return this.publicacionesService.agregarComentario(id, request.user.uuid, body.contenido)
  }

  //edito el contenido de un comentario propio
  @UseGuards(JwtAuthGuard)
  @Put(':id/comentarios/:comentarioId')
  editarComentario(
    @Param('id') id: string,
    @Param('comentarioId') comentarioId: string,
    @Body() body: UpdateComentarioDto,
    @Req() req: Request,
  ) {
    const request = req as Request & { user?: AuthPayload }
    //valido que el usuario este autenticado antes de editar
    if (!request.user) {
      throw new UnauthorizedException('token invalido')
    }

    //llamo al servicio para editar el comentario verificando autoria
    return this.publicacionesService.editarComentario(
      id,
      comentarioId,
      request.user.uuid,
      body.contenido,
    )
  }
}
