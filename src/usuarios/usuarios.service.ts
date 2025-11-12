import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Model, isValidObjectId } from 'mongoose';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { obtenerFechaNacimientoValidada } from '../utils/date-validators';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import type { Express } from 'express';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {}

  //creo un nuevo usuario con validaciones basicas
  async create(
    createUsuarioDto: CreateUsuarioDto & { imagenPerfil?: string },
  ): Promise<UsuarioDocument> {
    try {
      //normalizo email y username a minusculas
      const email = createUsuarioDto.email.toLowerCase();
      const userName = createUsuarioDto.userName.toLowerCase();
      const perfil = createUsuarioDto.perfil ?? 'usuario';

      //verifico que no exista otro usuario con el mismo email
      const emailExistente = await this.usuarioModel.findOne({ email }).exec();
      if (emailExistente) {
        throw new BadRequestException('el correo ya esta registrado');
      }

      //verifico que no exista otro usuario con el mismo nombre de usuario
      const userNameExistente = await this.usuarioModel
        .findOne({ userName })
        .exec();
      if (userNameExistente) {
        throw new BadRequestException(
          'el nombre de usuario ya esta registrado',
        );
      }

      //hasheo la contraseña antes de guardar
      const passwordHasheado = await bcrypt.hash(createUsuarioDto.password, 10);

      //convierto y valido la fecha de nacimiento
      const fechaNacimiento = obtenerFechaNacimientoValidada(
        createUsuarioDto.fechaNacimiento,
      );

      //creo el documento de usuario con todos los campos necesarios
      const nuevoUsuario = new this.usuarioModel({
        uuid: randomUUID(),
        nombre: createUsuarioDto.nombre,
        apellido: createUsuarioDto.apellido,
        email,
        userName,
        password: passwordHasheado,
        fechaNacimiento,
        descripcion: createUsuarioDto.descripcion,
        imagenPerfil: createUsuarioDto.imagenPerfil, //ruta relativa /images/archivo
        perfil,
        estado: true,
      });

      //guardo el usuario en la base de datos
      const guardado = await nuevoUsuario.save();
      return guardado;
    } catch (error) {
      //si el error es de validacion lo relanzo
      if (error instanceof BadRequestException) {
        throw error;
      }
      //si ocurre cualquier otro error, devuelvo 500
      throw new InternalServerErrorException('no se pudo crear el usuario');
    }
  }

  //busco usuario por email o nombre de usuario
  async findByEmailOrUserName(valor: {
    email?: string;
    userName?: string;
  }): Promise<UsuarioDocument | null> {
    //armo lista de filtros dinamicamente segun lo que reciba
    const filtros: Record<string, string>[] = [];

    const email = valor.email?.toLowerCase();
    const userName = valor.userName?.toLowerCase();

    //agrego los filtros disponibles
    if (email) filtros.push({ email });
    if (userName) filtros.push({ userName });

    //valido que se haya enviado al menos uno
    if (filtros.length === 0) {
      throw new BadRequestException(
        'debe enviar un email o un nombre de usuario',
      );
    }

    //busco el primer usuario que coincida con email o username
    const usuario = await this.usuarioModel.findOne({ $or: filtros }).exec();
    return usuario;
  }

  //busco usuario por uuid para reutilizarlo en otros modulos
  async findByUuid(uuid: string): Promise<UsuarioDocument | null> {
    const usuario = await this.usuarioModel.findOne({ uuid }).exec();
    return usuario;
  }

  //devuelvo el listado de usuarios segun el filtro de estado
  async listarUsuarios(incluirInactivos: boolean): Promise<UsuarioDocument[]> {
    const filtro = incluirInactivos ? {} : { estado: true };
    const usuarios = await this.usuarioModel.find(filtro).sort({ createdAt: -1 }).exec();
    return usuarios;
  }

  //actualizo el perfil del usuario autenticado
  async actualizarPerfil(
    uuid: string,
    datos: ActualizarUsuarioDto,
    imagenPerfil?: Express.Multer.File,
  ): Promise<UsuarioDocument> {
    try {
      //busco el usuario por uuid
      const usuario = await this.findByUuid(uuid);
      if (!usuario) {
        throw new NotFoundException('usuario no encontrado');
      }

      //si viene email y cambia, valido que no exista en otro usuario
      if (typeof datos.email === 'string') {
        //normalizo y comparo el email con el actual
        const email = datos.email.toLowerCase().trim();
        if (email !== '' && email !== usuario.email) {
          const emailExistente = await this.usuarioModel
            .findOne({ email, _id: { $ne: usuario._id } })
            .exec();
          if (emailExistente) {
            throw new BadRequestException('el correo ya esta registrado');
          }
          usuario.email = email;
        }
      }

      //si viene userName y cambia, valido que no exista en otro usuario
      if (typeof datos.userName === 'string') {
        //normalizo y comparo el username con el actual
        const userName = datos.userName.toLowerCase().trim();
        if (userName !== '' && userName !== usuario.userName) {
          const userNameExistente = await this.usuarioModel
            .findOne({ userName, _id: { $ne: usuario._id } })
            .exec();
          if (userNameExistente) {
            throw new BadRequestException(
              'el nombre de usuario ya esta registrado',
            );
          }
          usuario.userName = userName;
        }
      }

      //nombre
      if (typeof datos.nombre === 'string') {
        //elimino espacios y actualizo solo si no queda vacio
        const nombre = datos.nombre.trim();
        if (nombre !== '') {
          usuario.nombre = nombre;
        }
      }

      //apellido
      if (typeof datos.apellido === 'string') {
        //elimino espacios y actualizo solo si no queda vacio
        const apellido = datos.apellido.trim();
        if (apellido !== '') {
          usuario.apellido = apellido;
        }
      }

      //descripcion
      if (typeof datos.descripcion === 'string') {
        //guardo la descripcion recortada para evitar espacios extras
        const descripcion = datos.descripcion.trim();
        usuario.descripcion = descripcion;
      }

      //fecha de nacimiento (string YYYY-MM-DD)
      if (typeof datos.fechaNacimiento === 'string') {
        //valido y convierto la fecha solo si viene con algun valor
        const valor = datos.fechaNacimiento.trim();
        if (valor !== '') {
          //reutilizo la misma validacion que en el alta de usuario
          const fechaNacimiento = obtenerFechaNacimientoValidada(valor);
          usuario.fechaNacimiento = fechaNacimiento;
        }
      }

      //imagen de perfil nueva (archivo subido)
      if (imagenPerfil) {
        //mismo criterio que en create: guardo ruta relativa
        usuario.imagenPerfil = `/images/${imagenPerfil.filename}`;
      }

      //guardo los cambios en base de datos y retorno el documento actualizado
      const guardado = await usuario.save();
      return guardado;
    } catch (error) {
      //si el error es de validacion o de no encontrado lo relanzo
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      //ante cualquier otro error devuelvo un 500 generico
      throw new InternalServerErrorException('no se pudo actualizar el usuario');
    }
  }

  //transformo el documento de mongoose en objeto publico sin campos sensibles
  toPublic(usuario: UsuarioDocument) {
    const { password, __v, ...resto } = usuario.toObject() as Record<
      string,
      any
    >;
    //devuelvo solo los campos seguros para exponer al front
    return resto;
  }

  //comparo la contraseña enviada con el hash guardado
  async compararPassword(
    passwordPlano: string,
    passwordHash: string,
  ): Promise<boolean> {
    //uso bcrypt para comparar la contraseña plana con el hash
    const coincide = await bcrypt.compare(passwordPlano, passwordHash);
    return coincide;
  }

  //deshabilito a un usuario cambiando su estado a falso
  async deshabilitar(id: string): Promise<UsuarioDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('identificador invalido');
    }
    const usuario = await this.usuarioModel.findById(id).exec();
    if (!usuario) {
      throw new NotFoundException('usuario no encontrado');
    }
    usuario.estado = false;
    const guardado = await usuario.save();
    return guardado;
  }

  //reactivo a un usuario poniendo su estado en verdadero
  async reactivar(id: string): Promise<UsuarioDocument> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('identificador invalido');
    }
    const usuario = await this.usuarioModel.findById(id).exec();
    if (!usuario) {
      throw new NotFoundException('usuario no encontrado');
    }
    usuario.estado = true;
    const guardado = await usuario.save();
    return guardado;
  }
}
