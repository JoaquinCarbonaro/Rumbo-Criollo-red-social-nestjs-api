import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Publicacion, PublicacionDocument } from './schemas/publicacion.schema';

@Injectable()
export class EstadisticasService {
  constructor(
    @InjectModel(Publicacion.name)
    private readonly publicacionModel: Model<PublicacionDocument>
  ) {}

  //cuento las publicaciones creadas por cada usuario dentro del rango
  async contarPublicacionesPorUsuario(desde: string, hasta: string) {
    //convierto las cadenas recibidas en un rango de fechas normalizado a inicio y fin de dia
    const { fechaDesde, fechaHasta } = this.crearRango(desde, hasta);

    //defino el pipeline de agregacion para contar publicaciones por usuario
    const pipeline: PipelineStage[] = [
      {
        //filtro solo publicaciones activas dentro del rango de fechas
        $match: {
          estado: true,
          createdAt: { $gte: fechaDesde, $lte: fechaHasta }
        }
      },
      {
        //agrupo por id de autor y sumo la cantidad de publicaciones
        $group: {
          _id: '$autor',
          total: { $sum: 1 }
        }
      },
      {
        //busco los datos del usuario asociado a cada autor
        $lookup: {
          from: 'usuarios',
          localField: '_id',
          foreignField: '_id',
          as: 'autor'
        }
      },
      //como lookup devuelve un array lo convierto en un objeto simple
      { $unwind: '$autor' },
      {
        //armo el resultado con el nombre de usuario y el total de publicaciones
        $project: {
          _id: 0,
          nombre: '$autor.userName',
          total: 1
        }
      },
      //ordeno de mayor a menor segun la cantidad de publicaciones
      { $sort: { total: -1 } }
    ];

    //ejecuto el pipeline sobre la coleccion de publicaciones
    const resultado = await this.publicacionModel.aggregate(pipeline).exec();
    //si por algun motivo viene null devuelvo un arreglo vacio
    return resultado ?? [];
  }

  //cuento los comentarios realizados agrupados por dia
  async contarComentariosPorTiempo(desde: string, hasta: string) {
    //armo el rango de fechas incluyendo todo el dia desde y todo el dia hasta
    const { fechaDesde, fechaHasta } = this.crearRango(desde, hasta);

    //defino el pipeline para agrupar comentarios por fecha
    const pipeline: PipelineStage[] = [
      //filtro publicaciones activas
      { $match: { estado: true } },
      //separo cada comentario en un documento individual
      { $unwind: '$comentarios' },
      {
        //filtro solo los comentarios cuyo createdat este dentro del rango
        $match: {
          'comentarios.createdAt': { $gte: fechaDesde, $lte: fechaHasta }
        }
      },
      {
        //agrupo por fecha formateada yyyy-mm-dd y cuento la cantidad de comentarios
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$comentarios.createdAt'
            }
          },
          total: { $sum: 1 }
        }
      },
      //ordeno las fechas de manera ascendente
      { $sort: { _id: 1 } },
      {
        //proyecto el resultado con campos fecha y total
        $project: {
          _id: 0,
          fecha: '$_id',
          total: 1
        }
      }
    ];

    //ejecuto el pipeline sobre las publicaciones
    const resultado = await this.publicacionModel.aggregate(pipeline).exec();
    //devuelvo la lista o un arreglo vacio si no hay datos
    return resultado ?? [];
  }

  //cuento los comentarios recibidos por cada publicacion
  async contarComentariosPorPublicacion(desde: string, hasta: string) {
    //creo el rango de fechas para filtrar los comentarios
    const { fechaDesde, fechaHasta } = this.crearRango(desde, hasta);

    //defino el pipeline para agrupar comentarios por titulo de publicacion
    const pipeline: PipelineStage[] = [
      //filtro publicaciones activas
      { $match: { estado: true } },
      //desarmo el arreglo de comentarios para procesarlos uno por uno
      { $unwind: '$comentarios' },
      {
        //me quedo solo con los comentarios que estan dentro del rango de fechas
        $match: {
          'comentarios.createdAt': { $gte: fechaDesde, $lte: fechaHasta }
        }
      },
      {
        //agrupo por titulo de publicacion y cuento los comentarios
        $group: {
          _id: '$titulo',
          total: { $sum: 1 }
        }
      },
      //ordeno por cantidad de comentarios de mayor a menor
      { $sort: { total: -1 } },
      {
        //formateo el resultado exponiendo titulo y total
        $project: {
          _id: 0,
          titulo: '$_id',
          total: 1
        }
      }
    ];

    //ejecuto la agregacion sobre el modelo de publicaciones
    const resultado = await this.publicacionModel.aggregate(pipeline).exec();
    //si no hay resultados devuelvo un arreglo vacio para evitar null
    return resultado ?? [];
  }

  //creo un rango de fechas inclusivo para los pipelines
  private crearRango(desde: string, hasta: string) {
    //convierto la fecha desde y la fijo al inicio del dia (00:00:00.000)
    const fechaDesde = new Date(desde);
    fechaDesde.setHours(0, 0, 0, 0);

    //convierto la fecha hasta y la fijo al final del dia (23:59:59.999)
    const fechaHasta = new Date(hasta);
    fechaHasta.setHours(23, 59, 59, 999);

    //devuelvo las dos fechas listas para usar en los filtros de mongoose
    return { fechaDesde, fechaHasta };
  }
}
