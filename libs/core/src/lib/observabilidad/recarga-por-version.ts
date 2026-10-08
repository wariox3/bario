import { inject } from '@angular/core';
import { NavigationError, Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { filter } from 'rxjs';
import { ChunkNoCargaError } from './observabilidad.errors';

/**
 * Mensajes con que cada navegador rechaza un `import()` cuyo archivo ya no
 * existe (Chrome / Firefox / Safari). Pasa cuando hubo deploy y la pestaña
 * seguía con la versión vieja: el `rsync --delete` borró sus chunks.
 */
export const MENSAJES_CHUNK_NO_CARGA: readonly RegExp[] = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
];

const CLAVE_RECARGA = 'reddoc:recarga-por-version';
/** Si ya se recargó hace menos que esto y vuelve a fallar, no es la versión vieja. */
const VENTANA_RECARGA_MS = 10_000;

/**
 * Al fallar una navegación porque un chunk no carga, recarga la página una vez
 * en la URL de destino: así la persona baja la versión nueva sin enterarse.
 * Si tras recargar vuelve a fallar, se reporta (`ChunkNoCargaError`).
 */
export function recargarAnteVersionNueva(): void {
  inject(Router)
    .events.pipe(filter((evento): evento is NavigationError => evento instanceof NavigationError))
    .subscribe((evento) => {
      if (!esChunkNoCarga(evento.error)) return;

      // Sin poder recordar la recarga no se recarga: sería un bucle si el chunk
      // de verdad no existe.
      if (recargoHacePoco() || !marcarRecarga()) {
        Sentry.captureException(new ChunkNoCargaError(evento.url), {
          extra: { mensajeOriginal: mensajeDe(evento.error) },
        });
        return;
      }

      window.location.assign(evento.url);
    });
}

function esChunkNoCarga(error: unknown): boolean {
  const mensaje = mensajeDe(error);
  return MENSAJES_CHUNK_NO_CARGA.some((patron) => patron.test(mensaje));
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function recargoHacePoco(): boolean {
  try {
    const ultima = Number(sessionStorage.getItem(CLAVE_RECARGA));
    return Date.now() - ultima < VENTANA_RECARGA_MS;
  } catch {
    return false;
  }
}

/** `false` si no hay `sessionStorage` (modo privado estricto, almacenamiento bloqueado). */
function marcarRecarga(): boolean {
  try {
    sessionStorage.setItem(CLAVE_RECARGA, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}
