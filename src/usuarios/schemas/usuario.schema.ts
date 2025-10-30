import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

//defino el tipo de documento para mongoose
export type UsuarioDocument = HydratedDocument<Usuario>;

//esquema de la coleccion usuarios con timestamps
@Schema({ collection: 'usuarios', timestamps: true })
export class Usuario {
  //almaceno un uuid unico para identificar al usuario
  @Prop({ required: true }) uuid!: string;

  //guardo el nombre del usuario
  @Prop({ required: true }) nombre!: string;

  //guardo el apellido del usuario
  @Prop({ required: true }) apellido!: string;

  //guardo el email en minusculas y lo hago unico
  @Prop({ required: true, unique: true, lowercase: true })
  email!: string;

  //guardo el nombre de usuario en minusculas y lo hago unico
  @Prop({ required: true, unique: true, lowercase: true })
  userName!: string;

  //guardo la contraseña ya hasheada
  @Prop({ required: true })
  password!: string;

  //guardo la fecha de nacimiento como tipo Date
  @Prop({ required: true })
  fechaNacimiento!: Date;

  //guardo una breve descripcion del usuario
  @Prop({ required: true })
  descripcion!: string;

  //guardo la ruta relativa de la imagen servida desde /images
  @Prop()
  imagenPerfil?: string;

  //indico si el usuario esta activo o deshabilitado
  @Prop({ default: true })
  estado!: boolean;

  //defino el perfil del usuario, por defecto usuario comun
  @Prop({ default: 'usuario' })
  perfil!: 'usuario' | 'administrador';
}

//genero el esquema de mongoose a partir de la clase
export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
