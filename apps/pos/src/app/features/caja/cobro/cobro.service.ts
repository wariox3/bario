import { Injectable, inject } from '@angular/core';
import {
  type Observable,
  concat,
  defer,
  forkJoin,
  ignoreElements,
  map,
  of,
  switchMap,
  tap,
  throwError,
  catchError,
} from 'rxjs';
import { DocumentoPagoService, startOfToday } from '@reddoc/core';
import { CatalogosCobroService } from './catalogos-cobro.service';
import { pagosToPayload, solicitudToPayload } from './cobro.mapper';
import { CobroError, type EventoCobro, type FaseCobro, type SolicitudCobro } from './cobro.model';
import { VentaPosService } from '../../../core/documento/venta-pos.service';

/**
 * Cobra una venta: crea el documento, registra sus pagos y lo aprueba.
 *
 * Emite la fase en curso y, al terminar, el id del documento. Si un paso falla,
 * el error es un `CobroError` con la fase y el documento si ya existía, para que
 * la venta quede marcada y el siguiente intento **retome** en vez de crear otra
 * factura. Al retomar se verifica lo que ya quedó hecho en el backend: no se
 * registra un pago que ya está ni se aprueba un documento ya aprobado.
 */
@Injectable({ providedIn: 'root' })
export class CobroService {
  private readonly ventas = inject(VentaPosService);
  private readonly pagos = inject(DocumentoPagoService);
  private readonly catalogos = inject(CatalogosCobroService);

  cobrar(solicitud: SolicitudCobro): Observable<EventoCobro> {
    const retomado = solicitud.venta.cobro;
    let documentoId: number | null = retomado?.documentoId ?? null;
    let pagado = retomado?.pagado ?? false;
    let fase: FaseCobro = 'preparando';

    const paso = (
      siguiente: FaseCobro,
      trabajo: () => Observable<unknown>,
    ): Observable<EventoCobro> =>
      defer(() => {
        fase = siguiente;
        return concat(
          of<EventoCobro>({ tipo: 'fase', fase: siguiente }),
          trabajo().pipe(ignoreElements()),
        );
      });

    const idDocumento = (): number => {
      if (documentoId === null) throw new CobroError(fase, null, pagado, null);
      return documentoId;
    };

    const crear = paso('guardando', () =>
      documentoId !== null
        ? of(null)
        : forkJoin({
            metodo: this.catalogos.metodoPago(solicitud.medio.codigoDian),
            plazo: this.catalogos.plazoContado(),
          }).pipe(
            switchMap(({ metodo, plazo }) =>
              this.ventas.crear(solicitudToPayload(solicitud, metodo, plazo, startOfToday())),
            ),
            tap((id) => (documentoId = id)),
          ),
    );

    const pagar = paso('pagando', () => {
      if (pagado) return of(null);
      const id = idDocumento();
      // Al retomar, un pago que alcanzó a quedar no se vuelve a registrar.
      const yaRegistrados = retomado
        ? this.pagos.listarPorDocumento(id).pipe(map((ps) => ps.some((p) => !p.estado_anulado)))
        : of(false);
      return yaRegistrados.pipe(
        switchMap((hay) =>
          hay
            ? of(null)
            : forkJoin(pagosToPayload(id, solicitud.pagos).map((p) => this.pagos.crear(p))),
        ),
        tap(() => (pagado = true)),
      );
    });

    const aprobar = paso('aprobando', () => {
      const id = idDocumento();
      // Al retomar, la aprobación pudo haber quedado aunque su respuesta se perdiera.
      const yaAprobado = retomado ? this.ventas.estaAprobado(id) : of(false);
      return yaAprobado.pipe(
        switchMap((aprobado) => (aprobado ? of(null) : this.ventas.aprobar(id))),
      );
    });

    const listo = defer(() => of<EventoCobro>({ tipo: 'listo', documentoId: idDocumento() }));

    return concat(crear, pagar, aprobar, listo).pipe(
      catchError((causa: unknown) =>
        throwError(() =>
          causa instanceof CobroError ? causa : new CobroError(fase, documentoId, pagado, causa),
        ),
      ),
    );
  }
}
