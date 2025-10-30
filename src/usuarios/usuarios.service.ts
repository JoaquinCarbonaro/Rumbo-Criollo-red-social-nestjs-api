import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { Usuario, UsuarioDocument } from './schemas/usuario.schema';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectModel(Usuario.name)
    private readonly usuarioModel: Model<UsuarioDocument>,
  ) {}

  //creo un nuevo usuario con validaciones basicas
  async create(createUsuarioDto: CreateUsuarioDto & { imagenPerfil?: string }): Promise<UsuarioDocument> {
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
      const userNameExistente = await this.usuarioModel.findOne({ userName }).exec();
      if (userNameExistente) {
        throw new BadRequestException('el nombre de usuario ya esta registrado');
      }

      //hasheo la contraseña antes de guardar
      const passwordHasheado = await bcrypt.hash(createUsuarioDto.password, 10);

      //convierto la fecha de nacimiento a tipo Date
      const fechaNacimiento = new Date(createUsuarioDto.fechaNacimiento);

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
      throw new BadRequestException('debe enviar un email o un nombre de usuario');
    }

    //busco el primer usuario que coincida con email o username
    const usuario = await this.usuarioModel.findOne({ $or: filtros }).exec();
    return usuario;
  }

  //transformo el documento de mongoose en objeto publico sin campos sensibles
  toPublic(usuario: UsuarioDocument) {
    const { password, __v, ...resto } = usuario.toObject() as Record<string, any>;
    return resto;
  }

  //comparo la contraseña enviada con el hash guardado
  async compararPassword(passwordPlano: string, passwordHash: string): Promise<boolean> {
    const coincide = await bcrypt.compare(passwordPlano, passwordHash);
    return coincide;
  }
}
