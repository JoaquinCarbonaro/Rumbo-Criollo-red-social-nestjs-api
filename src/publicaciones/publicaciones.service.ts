import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreatePublicacionDto } from './dto/create-publicacion.dto';
import { Publicacion, PublicacionDocument } from './schemas/publicacion.schema';
import { UsuariosService } from '../usuarios/usuarios.service';

//defino la forma plana del autor cuando viene de populate o lean
interface AutorPlano {
  _id?: Types.ObjectId | string;
  userName?: string;
  imagenPerfil?: string;
  estado?: boolean;
}

//defino la forma plana de la publicacion para mapearla al formato del front
interface PublicacionPlano {
  _id?: Types.ObjectId | string;
  titulo: string;
  mensaje: string;
  imagen?: string;
  createdAt?: Date;
  updatedAt?: Date;
  likes: (Types.ObjectId | string | { _id?: Types.ObjectId | string; uuid?: string })[];
  autor?: AutorPlano | null;
  likesCount?: number;
}

//estructura plana de un comentario dentro de una publicacion
interface ComentarioPlano {
  _id?: Types.ObjectId | string;
  contenido?: string;
  createdAt?: Date;
  updatedAt?: Date;
  modificado?: boolean;
  usuario?:
    | AutorPlano
    | Types.ObjectId
    | string
    | (AutorPlano & { uuid?: string })
    | { _id?: Types.ObjectId | string; userName?: string; imagenPerfil?: string; uuid?: string }
    | null;
}

@Injectable()
export class PublicacionesService {
  constructor(
    //inyecto el modelo de mongoose para la coleccion publicaciones
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<PublicacionDocument>,

    //inyecto el servicio de usuarios usando forwardref para evitar ciclo de dependencias
    @Inject(forwardRef(() => UsuariosService))
    private readonly usuariosService: UsuariosService,
  ) {}

  //creo una nueva publicacion asociada al usuario que realiza la solicitud
  async crear(
    createPublicacionDto: CreatePublicacionDto,
    usuarioUuid: string,
    imagen?: Express.Multer.File,
  ) {
    //busco el usuario por uuid y verifico que este activo
    const autor = await this.obtenerUsuarioActivo(usuarioUuid);
    if (!autor) {
      throw new BadRequestException('usuario no encontrado');
    }

    //obtengo la descripcion tomando en cuenta compatibilidad con versiones previas
    const tituloBase = createPublicacionDto.titulo?.trim() ?? '';
    const descripcionBase = (
      createPublicacionDto.descripcion ?? createPublicacionDto.mensaje ?? ''
    ).trim();

    //valido que se haya enviado titulo y descripcion
    if (tituloBase === '' || descripcionBase === '') {
      throw new BadRequestException('debe enviar titulo y descripcion');
    }

    //si viene archivo de imagen construyo la ruta relativa
    const rutaImagen = imagen?.filename
      ? `/images/${imagen.filename}`
      : undefined;

    //creo la instancia de publicacion con valores iniciales
    const nuevaPublicacion = new this.publicacionModel({
      titulo: tituloBase,
      mensaje: descripcionBase,
      imagen: rutaImagen,
      autor: autor._id,
      likes: [],
      likesCount: 0,
      estado: true,
    });

    //guardo en base de datos y luego hago populate del autor
    const guardada = await nuevaPublicacion.save();
    const poblada = await guardada.populate([
      { path: 'autor', select: 'uuid userName imagenPerfil estado' },
      { path: 'likes', select: 'uuid' },
    ]);
    //mapeo la publicacion al formato esperado por el frontend
    const respuesta = this.mapearPublicacion(poblada);
    return respuesta;
  }

  //listo publicaciones activas con paginacion y filtros basicos
  async listar(
    offset: number,
    limit: number,
    order: 'createdAt' | 'likes',
    autorReferencia?: string,
  ) {
    //normalizo offset y limite para evitar valores invalidos
    const offsetSeguro = offset >= 0 ? offset : 0;
    const limiteSeguro = limit > 0 ? limit : 10;
    const limiteFinal = limiteSeguro > 50 ? 50 : limiteSeguro;
    const skip = offsetSeguro;

    //filtro base solo por publicaciones activas
    const filtro: FilterQuery<PublicacionDocument> = { estado: true };

    //si viene autorId lo valido y lo agrego al filtro
    if (autorReferencia) {
      const autorNormalizado = autorReferencia.trim();
      if (autorNormalizado === '') {
        throw new BadRequestException('autor invalido');
      }
      const esObjectIdValido = Types.ObjectId.isValid(autorNormalizado);
      if (esObjectIdValido) {
        //si el valor es un objectid valido filtro directamente por ese id
        filtro.autor = new Types.ObjectId(autorNormalizado);
      } else {
        //si no es objectid asumo uuid y lo busco en el servicio de usuarios
        const usuario = await this.usuariosService.findByUuid(
          autorNormalizado,
        );
        if (!usuario || usuario.estado === false) {
          throw new BadRequestException('autor no encontrado');
        }
        //uso el _id del usuario encontrado como filtro
        filtro.autor = usuario._id;
      }
    }

    //selecciono el campo de orden segun el criterio
    const campoOrden = order === 'likes' ? 'likesCount' : 'createdAt';

    //armo la consulta principal con sort, skip, limit y populate
    const consulta: Promise<PublicacionPlano[]> = this.publicacionModel
      .find(filtro)
      .sort({ [campoOrden]: -1, createdAt: -1 })
      .skip(skip)
      .limit(limiteFinal)
      .populate('autor', 'uuid userName imagenPerfil estado')
      .populate('likes', 'uuid')
      .lean<PublicacionPlano[]>()
      .exec();

    //cuento el total de documentos para la paginacion
    const totalConsulta: Promise<number> = this.publicacionModel
      .countDocuments(filtro)
      .exec();

    //espero los resultados de ambas consultas en paralelo
    const publicaciones = await consulta;
    const total = await totalConsulta;

    //filtro publicaciones cuyo autor este activo
    const activas = publicaciones.filter((publicacion) => {
      const autorActivo =
        publicacion.autor && publicacion.autor.estado !== false;
      return autorActivo;
    });

    //mapeo los datos al formato de respuesta
    const data = activas.map((item) => this.mapearPublicacion(item));
    //hay mas si la suma de offset y cantidad actual es menor al total
    const hasMore = offsetSeguro + data.length < total;

    return {
      publicaciones: data,
      total,
      hasMore,
    };
  }

  //obtengo el detalle completo de una publicacion con sus comentarios
  async obtenerDetalle(publicacionId: string) {
    const publicacion = await this.publicacionModel
      .findById(publicacionId)
      .populate('autor', 'uuid userName imagenPerfil estado')
      .populate('likes', 'uuid')
      .populate('comentarios.usuario', 'uuid userName imagenPerfil estado')
      .exec();

    if (!publicacion || publicacion.estado === false) {
      throw new NotFoundException('publicacion no encontrada');
    }

    //mapeo la publicacion incluyendo comentarios
    return this.mapearPublicacion(publicacion, true);
  }

  //traigo los comentarios de una publicacion aplicando paginado y orden
  async listarComentarios(publicacionId: string, skip: number, limit: number) {
    const skipSeguro = skip >= 0 ? skip : 0;
    const limiteSeguro = limit > 0 ? limit : 3;

    const publicacion = await this.publicacionModel
      .findById(publicacionId)
      .select('comentarios estado')
      .populate('comentarios.usuario', 'uuid userName imagenPerfil estado')
      .exec();

    if (!publicacion || publicacion.estado === false) {
      throw new NotFoundException('publicacion no encontrada');
    }

    const comentariosBase = Array.isArray(publicacion.comentarios)
      ? publicacion.comentarios
      : [];

    //ordeno los comentarios por fecha descendente
    const comentariosOrdenados = [...comentariosBase].sort((a, b) => {
      const fechaA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
      const fechaB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
      return fechaB - fechaA;
    });

    const total = comentariosOrdenados.length;
    const pagina = comentariosOrdenados.slice(skipSeguro, skipSeguro + limiteSeguro);
    //mapeo cada comentario al formato esperado por el front
    const comentarios = pagina.map((comentario) => this.mapearComentario(comentario));
    const hasMore = skipSeguro + pagina.length < total;

    return {
      comentarios,
      total,
      hasMore,
    };
  }

  //agrego un nuevo comentario asociado a la publicacion indicada
  async agregarComentario(publicacionId: string, usuarioUuid: string, contenido: string) {
    const usuario = await this.obtenerUsuarioActivo(usuarioUuid);
    if (!usuario) {
      throw new ForbiddenException('usuario no autorizado');
    }

    const comentarioNormalizado = (contenido ?? '').trim();
    if (comentarioNormalizado === '') {
      throw new BadRequestException('el comentario no puede estar vacio');
    }

    const publicacion = await this.publicacionModel.findById(publicacionId);
    if (!publicacion || publicacion.estado === false) {
      throw new NotFoundException('publicacion no encontrada');
    }

    //genero un id propio para el nuevo comentario
    const comentarioId = new Types.ObjectId();
    const nuevoComentario = {
      _id: comentarioId,
      usuario: usuario._id,
      contenido: comentarioNormalizado,
      modificado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    //inserto el comentario en el arreglo de la publicacion
    const actualizada = await this.publicacionModel
      .findByIdAndUpdate(
        publicacionId,
        { $push: { comentarios: nuevoComentario } },
        { new: true },
      )
      .populate('comentarios.usuario', 'uuid userName imagenPerfil estado')
      .exec();

    if (!actualizada) {
      throw new NotFoundException('publicacion no encontrada');
    }

    //busco el comentario recien insertado por su id
    const comentarioCreado = actualizada.comentarios.find((comentario) => {
      const comentarioIdGuardado = this.obtenerIdComoString(comentario._id);
      return comentarioIdGuardado !== '' && comentarioIdGuardado === comentarioId.toString();
    });

    if (!comentarioCreado) {
      throw new NotFoundException('no se pudo registrar el comentario');
    }

    //retorno el comentario mapeado para el frontend
    return this.mapearComentario(comentarioCreado);
  }

  //edito el contenido de un comentario existente
  async editarComentario(
    publicacionId: string,
    comentarioId: string,
    usuarioUuid: string,
    contenido: string,
  ) {
    const usuario = await this.obtenerUsuarioActivo(usuarioUuid);
    if (!usuario) {
      throw new ForbiddenException('usuario no autorizado');
    }

    const comentarioNormalizado = (contenido ?? '').trim();
    if (comentarioNormalizado === '') {
      throw new BadRequestException('el comentario no puede estar vacio');
    }

    const publicacion = await this.publicacionModel
      .findById(publicacionId)
      .populate('comentarios.usuario', 'uuid userName imagenPerfil estado')
      .exec();

    if (!publicacion || publicacion.estado === false) {
      throw new NotFoundException('publicacion no encontrada');
    }

    if (!Types.ObjectId.isValid(comentarioId)) {
      throw new NotFoundException('comentario no encontrado');
    }

    //busco el comentario dentro del arreglo usando su id
    const comentarioBuscado = publicacion.comentarios.find((comentario) => {
      const comentarioIdGuardado = this.obtenerIdComoString(comentario._id);
      return comentarioIdGuardado === comentarioId;
    });

    if (!comentarioBuscado) {
      throw new NotFoundException('comentario no encontrado');
    }

    //verifico que el comentario pertenezca al usuario que edita
    const esAutorComentario = this.compararIds(comentarioBuscado.usuario, usuario._id);
    if (!esAutorComentario) {
      throw new ForbiddenException('solo podes editar tus comentarios');
    }

    //actualizo contenido y marco el comentario como modificado
    comentarioBuscado.contenido = comentarioNormalizado;
    comentarioBuscado.modificado = true;
    comentarioBuscado.updatedAt = new Date();

    await publicacion.save();
    await publicacion.populate('comentarios.usuario', 'uuid userName imagenPerfil estado');

    //busco la version final del comentario luego del guardado
    const comentarioActualizado = publicacion.comentarios.find((comentario) => {
      const comentarioIdGuardado = this.obtenerIdComoString(comentario._id);
      return comentarioIdGuardado === comentarioId;
    });

    if (!comentarioActualizado) {
      throw new NotFoundException('comentario no encontrado');
    }

    return this.mapearComentario(comentarioActualizado);
  }

  //busco todas las publicaciones activas realizadas por un autor especifico
  async findByAutor(autorId: Types.ObjectId) {
    //valido que el id sea valido
    if (!autorId || !Types.ObjectId.isValid(autorId)) {
      throw new BadRequestException('id de autor invalido');
    }

    //busco publicaciones activas creadas por este autor
    const publicaciones = await this.publicacionModel
      .find({ autor: autorId, estado: true })
      .sort({ createdAt: -1 }) //ordeno por fecha descendente
      .populate('autor', 'uuid userName imagenPerfil estado') //pueblo datos del autor
      .populate('likes', 'uuid')
      .lean<PublicacionPlano[]>()
      .exec();

    //filtro las que tengan autor activo
    const activas = publicaciones.filter((p) => p.autor?.estado !== false);

    //transformo cada documento al formato esperado por el front
    const data = activas.map((item) => this.mapearPublicacion(item));

    return data;
  }

  //elimino una publicacion mediante baja logica
  async eliminar(publicacionId: string, usuarioUuid: string, esAdmin: boolean) {
    //busco la publicacion por id
    const publicacion = await this.publicacionModel.findById(publicacionId);
    if (!publicacion || publicacion.estado === false) {
      throw new NotFoundException('publicacion no encontrada');
    }

    //obtengo el usuario que hace la solicitud y valido que este activo
    const autor = await this.obtenerUsuarioActivo(usuarioUuid);
    if (!autor) {
      throw new ForbiddenException('usuario no autorizado');
    }

    //verifico si el usuario que pide la baja es el autor
    const esAutor =
      publicacion.autor instanceof Types.ObjectId
        ? publicacion.autor.equals(autor._id)
        : false;

    //solo el autor o un admin pueden eliminar la publicacion
    if (!esAutor && !esAdmin) {
      throw new ForbiddenException(
        'no tiene permiso para eliminar esta publicacion',
      );
    }

    //marco la publicacion como inactiva (baja logica)
    publicacion.estado = false;
    await publicacion.save();

    return { mensaje: 'publicacion eliminada' };
  }

  //agrego un me gusta a la publicacion seleccionada
  async darLike(publicacionId: string, usuarioUuid: string) {
    //busco la publicacion y verifico que este activa
    const publicacion = await this.publicacionModel.findById(publicacionId);
    if (!publicacion || publicacion.estado === false) {
      throw new NotFoundException('publicacion no encontrada');
    }

    //valido que el usuario exista y este activo
    const autor = await this.obtenerUsuarioActivo(usuarioUuid);
    if (!autor) {
      throw new ForbiddenException('usuario no autorizado');
    }

    //verifico que el usuario no haya dado like antes
    const yaExiste = publicacion.likes.some((id) => {
      if (id instanceof Types.ObjectId) {
        return id.equals(autor._id);
      }
      if (typeof (id as any)?.equals === 'function') {
        return (id as any).equals(autor._id);
      }
      return String(id) === autor._id.toString();
    });
    if (yaExiste) {
      throw new BadRequestException('la publicacion ya tiene tu me gusta');
    }

    //agrego el like y actualizo el contador
    publicacion.likes.push(autor._id);
    publicacion.likesCount = publicacion.likes.length;
    await publicacion.save();

    //pueblo datos del autor para la respuesta
    const poblada = await publicacion.populate([
      { path: 'autor', select: 'uuid userName imagenPerfil estado' },
      { path: 'likes', select: 'uuid' },
    ]);
    return this.mapearPublicacion(poblada);
  }

  //quito un me gusta si el usuario lo habia agregado antes
  async quitarLike(publicacionId: string, usuarioUuid: string) {
    //busco la publicacion y verifico que este activa
    const publicacion = await this.publicacionModel.findById(publicacionId);
    if (!publicacion || publicacion.estado === false) {
      throw new NotFoundException('publicacion no encontrada');
    }

    //valido que el usuario exista y este activo
    const autor = await this.obtenerUsuarioActivo(usuarioUuid);
    if (!autor) {
      throw new ForbiddenException('usuario no autorizado');
    }

    //filtro los likes quitando el del usuario actual
    const likesFiltrados = publicacion.likes.filter((id) => {
      if (id instanceof Types.ObjectId) {
        return !id.equals(autor._id);
      }
      if (typeof (id as any)?.equals === 'function') {
        return !(id as any).equals(autor._id);
      }
      return String(id) !== autor._id.toString();
    });
    //si no cambio la lista es porque no habia like previo
    if (likesFiltrados.length === publicacion.likes.length) {
      throw new BadRequestException(
        'no habias dado me gusta a esta publicacion',
      );
    }

    //actualizo la lista de likes y el contador
    publicacion.likes = likesFiltrados;
    publicacion.likesCount = publicacion.likes.length;
    await publicacion.save();

    //pueblo datos del autor para la respuesta
    const poblada = await publicacion.populate([
      { path: 'autor', select: 'uuid userName imagenPerfil estado' },
      { path: 'likes', select: 'uuid' },
    ]);
    return this.mapearPublicacion(poblada);
  }

  //busco usuario activo por uuid reutilizando el servicio de usuarios
  private async obtenerUsuarioActivo(usuarioUuid: string) {
    //si no viene uuid retorno null
    if (!usuarioUuid) {
      return null;
    }
    //busco el usuario por uuid
    const usuario = await this.usuariosService.findByUuid(usuarioUuid);
    if (!usuario) {
      return null;
    }
    //si el usuario esta inactivo retorno null
    if (usuario.estado === false) {
      return null;
    }
    //si llega hasta aca es un usuario valido y activo
    return usuario;
  }

  //normalizo la salida de la publicacion para el frontend
  private mapearPublicacion(
    origen: PublicacionDocument | PublicacionPlano,
    incluirComentarios = false,
  ) {
    //detect
    //determino si el origen es un documento de mongoose o un objeto plano
    const esDocumento =
      typeof (origen as PublicacionDocument).toObject === 'function';
    //si es documento de mongoose lo convierto a objeto plano para trabajar mas facil
    const base = esDocumento
      ? ((origen as PublicacionDocument).toObject() as PublicacionPlano)
      : (origen as PublicacionPlano);

    //convierto los likes a strings para el frontend
    const likes = Array.isArray(base.likes)
      ? base.likes.reduce<string[]>((acumulador, like) => {
          //si no hay like lo salto
          if (!like) {
            return acumulador;
          }

          //si ya es string lo agrego directamente
          if (typeof like === 'string') {
            acumulador.push(like);
            return acumulador;
          }

          //si es objectid lo convierto a string
          if (like instanceof Types.ObjectId) {
            acumulador.push(like.toString());
            return acumulador;
          }

          //si viene como objeto mixto intento extraer uuid o id
          const likeObjeto = like as Record<string, any>;
          const uuidLike = typeof likeObjeto.uuid === 'string' ? likeObjeto.uuid : undefined;
          if (uuidLike) {
            acumulador.push(uuidLike);
            return acumulador;
          }

          const idLike = likeObjeto._id;
          if (idLike instanceof Types.ObjectId) {
            acumulador.push(idLike.toString());
            return acumulador;
          }

          if (typeof idLike === 'string') {
            acumulador.push(idLike);
            return acumulador;
          }

          //si ninguno de los casos aplica, no agrego nada
          return acumulador;
        }, [])
      : [];

    //armo el objeto autor si existe
    const autorBase = base.autor ?? undefined;
    const autor = autorBase
      ? {
          _id:
            autorBase._id instanceof Types.ObjectId
              ? autorBase._id.toString()
              : (autorBase._id ?? ''),
          userName: autorBase.userName ?? '',
          imagenPerfil: autorBase.imagenPerfil ?? undefined,
          uuid:
            typeof (autorBase as Record<string, any>).uuid === 'string'
              ? (autorBase as Record<string, any>).uuid
              : undefined,
        }
      : undefined;

    //si me piden incluir comentarios preparo el arreglo base
    const comentariosBase =
      incluirComentarios && Array.isArray((base as Record<string, any>).comentarios)
        ? ((base as Record<string, any>).comentarios as ComentarioPlano[])
        : [];

    const comentarios = incluirComentarios
      ? [...comentariosBase]
          .sort((a, b) => {
            const fechaA = this.obtenerFechaComentario(a);
            const fechaB = this.obtenerFechaComentario(b);
            return fechaB - fechaA;
          })
          .map((comentario) => this.mapearComentario(comentario))
      : [];

    //construyo el objeto final que devolvere al frontend
    const respuesta = {
      _id:
        base._id instanceof Types.ObjectId
          ? base._id.toString()
          : (base._id ?? ''),
      titulo: base.titulo,
      mensaje: base.mensaje,
      //mantengo descripcion igual que mensaje para compatibilidad con el front
      descripcion: base.mensaje,
      imagen: base.imagen,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      likes,
      autor,
      //recalculo el contador de likes a partir del array normalizado
      likesCount: likes.length,
      comentarios,
    };

    return respuesta;
  }

  //transformo un comentario al formato esperado en el frontend
  private mapearComentario(origen: ComentarioPlano | any) {
    const esDocumento = typeof origen?.toObject === 'function';
    const base = esDocumento
      ? ((origen as { toObject: () => ComentarioPlano }).toObject() as ComentarioPlano)
      : ((origen ?? {}) as ComentarioPlano);

    const usuario = this.mapearUsuarioComentario(base.usuario);

    return {
      _id: this.obtenerIdComoString(base._id),
      contenido: base.contenido ?? '',
      createdAt: base.createdAt ?? new Date(),
      updatedAt: base.updatedAt ?? base.createdAt ?? new Date(),
      modificado: base.modificado === true,
      usuario,
    };
  }

  //normalizo los datos del usuario que escribio el comentario
  private mapearUsuarioComentario(origen: ComentarioPlano['usuario']) {
    if (!origen) {
      return { _id: '', userName: '', imagenPerfil: undefined, uuid: undefined };
    }

    if (typeof origen === 'string') {
      return { _id: origen, userName: '', imagenPerfil: undefined, uuid: undefined };
    }

    if (origen instanceof Types.ObjectId) {
      return { _id: origen.toString(), userName: '', imagenPerfil: undefined, uuid: undefined };
    }

    const origenObjeto = origen as Record<string, any>;
    const id = this.obtenerIdComoString(origenObjeto);
    const userName =
      typeof origenObjeto.userName === 'string'
        ? origenObjeto.userName
        : typeof origenObjeto.nombre === 'string'
        ? origenObjeto.nombre
        : '';
    const imagenPerfil =
      typeof origenObjeto.imagenPerfil === 'string'
        ? origenObjeto.imagenPerfil
        : typeof origenObjeto.avatar === 'string'
        ? origenObjeto.avatar
        : undefined;
    const uuid = typeof origenObjeto.uuid === 'string' ? origenObjeto.uuid : undefined;

    return { _id: id, userName, imagenPerfil, uuid };
  }

  //obtengo el identificador en formato string sin importar la forma original
  private obtenerIdComoString(valor: unknown): string {
    if (!valor) {
      return '';
    }

    if (valor instanceof Types.ObjectId) {
      return valor.toString();
    }

    if (typeof valor === 'string') {
      return valor;
    }

    if (typeof valor === 'object') {
      const objeto = valor as Record<string, unknown>;
      const posibleId = objeto._id;

      if (posibleId instanceof Types.ObjectId) {
        return posibleId.toString();
      }

      if (typeof posibleId === 'string') {
        return posibleId;
      }
    }

    return '';
  }

  //comparo dos identificadores manejando objectid y strings
  private compararIds(origen: unknown, destino: Types.ObjectId) {
    const origenId = this.obtenerIdComoString(origen);
    if (origenId === '') {
      return false;
    }
    return origenId === destino.toString();
  }

  //obtengo la fecha del comentario como timestamp para ordenar
  private obtenerFechaComentario(comentario: ComentarioPlano) {
    if (comentario.createdAt instanceof Date) {
      return comentario.createdAt.getTime();
    }

    if (comentario.createdAt) {
      const fecha = new Date(comentario.createdAt);
      if (!Number.isNaN(fecha.getTime())) {
        return fecha.getTime();
      }
    }

    return 0;
  }
}
