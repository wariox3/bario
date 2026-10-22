import { HttpResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { CatalogoCacheService } from '../data/catalogo-cache.service';

/** Métodos que no cambian nada en el backend. */
const LECTURAS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Invalida los catálogos en cache del recurso que una escritura acaba de
 * cambiar: un `POST /general/contacto/` exitoso descarta
 * `/general/contacto/seleccionar/`, y el próximo select que se abra trae el
 * tercero recién creado.
 *
 * Mira la URL y no quién hizo la petición, así cubre por igual el alta inline
 * desde un modal, el formulario del master y cualquier acción que escriba. Un
 * `POST …/lista/` (que es una lectura) también invalida su recurso: cuesta a lo
 * sumo una consulta de más, nunca un dato viejo.
 *
 * Solo invalida si la escritura salió bien: una fallida no cambió nada.
 */
export const catalogoCacheInterceptor: HttpInterceptorFn = (req, next) => {
  if (LECTURAS.has(req.method)) return next(req);
  const cache = inject(CatalogoCacheService);
  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) cache.invalidar(req.url);
    }),
  );
};
