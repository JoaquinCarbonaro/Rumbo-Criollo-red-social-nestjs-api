import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Usuario } from '../../usuarios/schemas/usuario.schema';

//defino el tipo de documento para las publicaciones
export type PublicacionDocument = HydratedDocument<Publicacion>;

//coleccion de publicaciones con timestamps habilitados
@Schema({ collection: 'publicaciones', timestamps: true })
export class Publicacion {
  
  //titulo visible de la publicacion
  @Prop({ required: true })
  titulo!: string;

  //descripcion principal o mensaje del posteo
  @Prop({ required: true })
  mensaje!: string;

  //referencia al autor que creo la publicacion
  @Prop({ type: Types.ObjectId, ref: Usuario.name, required: true })
  autor!: Types.ObjectId;

  //ruta relativa de la imagen guardada
  @Prop()
  imagen?: string;

  //lista de usuarios que dieron me gusta
  @Prop({ type: [Types.ObjectId], ref: Usuario.name, default: [] })
  likes!: Types.ObjectId[];

  //contador usado para ordenar por cantidad de me gusta
  @Prop({ type: Number, default: 0 })
  likesCount!: number;

  //flag de baja logica para ocultar publicaciones
  @Prop({ type: Boolean, default: true })
  estado!: boolean;

  //se implementara en el sprint 3
  @Prop({ default: [] })
  comentarios?: any[];
}

//creo el esquema de mongoose a partir de la clase
export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);

//indice para listar publicaciones activas ordenadas por fecha
PublicacionSchema.index({ estado: 1, createdAt: -1 });

//indice para listar publicaciones activas ordenadas por cantidad de me gusta
PublicacionSchema.index({ estado: 1, likesCount: -1, createdAt: -1 });

//indice para listar publicaciones de un autor especifico ordenadas por fecha
PublicacionSchema.index({ autor: 1, estado: 1, createdAt: -1 });
