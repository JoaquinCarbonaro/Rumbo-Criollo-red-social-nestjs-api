import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EstadisticasService } from './estadisticas.service';
import { ValidarFechasPipe } from './pipes/validar-fechas.pipe';

@Controller('estadisticas')
@UseGuards(JwtAuthGuard, AdminGuard) //sol admin
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  //devuelvo la cantidad de publicaciones realizadas por cada usuario dentro del rango indicado
  @Get('publicaciones-por-usuario')
  publicacionesPorUsuario(
    @Query(new ValidarFechasPipe()) query: { desde: string; hasta: string }
  ) {
    //llamo al servicio para calcular las publicaciones del rango
    return this.estadisticasService.contarPublicacionesPorUsuario(
      query.desde,
      query.hasta
    );
  }

  //devuelvo la cantidad total de comentarios agrupados por fecha
  @Get('comentarios-por-tiempo')
  comentariosPorTiempo(
    @Query(new ValidarFechasPipe()) query: { desde: string; hasta: string }
  ) {
    //llamo al servicio para contar los comentarios por dia dentro del rango
    return this.estadisticasService.contarComentariosPorTiempo(
      query.desde,
      query.hasta
    );
  }

  //devuelvo la cantidad de comentarios que recibio cada publicacion en el rango indicado
  @Get('comentarios-por-publicacion')
  comentariosPorPublicacion(
    @Query(new ValidarFechasPipe()) query: { desde: string; hasta: string }
  ) {
    //llamo al servicio para agrupar los comentarios por titulo de publicacion
    return this.estadisticasService.contarComentariosPorPublicacion(
      query.desde,
      query.hasta
    );
  }
}
