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
  private mapearPublicacion(origen: PublicacionDocument | PublicacionPlano) {
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
    };

    return respuesta;
  }
}
