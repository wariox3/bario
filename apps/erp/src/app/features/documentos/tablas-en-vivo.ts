import type { ToastService } from '@reddoc/core';
import { extractErrorMessage } from '@reddoc/core';
import { Observable, concat, defer, of, throwError } from 'rxjs';
import { catchError, ignoreElements } from 'rxjs/operators';

/** Título y descripción de un toast, tal como vienen del diccionario. */
interface ToastTexto {
  readonly title: string;
  readonly desc: string;
}

/**
 * Contrato mínimo de una tabla que transacciona en vivo contra el backend (líneas de
 * `documento-detalle`, pagos de `documento-pago`): el form padre le pide si tiene
 * pendientes incompletos y que guarde los que sí puede.
 */
export interface TablaEnVivo {
  hasInvalidPending(): boolean;
  saveAll(): Observable<void>;
}

/** Una tabla del documento con la pestaña que la contiene y sus textos de aviso. */
export interface TablaEnVivoDocumento<TTab extends string> {
  /** `undefined` si la tabla no está montada o no aplica al documento (nota débito sin pagos). */
  readonly tabla: TablaEnVivo | undefined;
  readonly tab: TTab;
  /** Aviso cuando la tabla tiene pendientes incompletos. */
  readonly incompleta: ToastTexto;
  /** Error cuando falla su guardado; la descripción se reemplaza por la del backend si viene. */
  readonly errorAlGuardar: ToastTexto;
}

/** Primera tabla, en orden, con pendientes incompletos; `null` si todas se pueden guardar. */
export function primeraTablaIncompleta<TTab extends string>(
  tablas: readonly TablaEnVivoDocumento<TTab>[],
): TablaEnVivoDocumento<TTab> | null {
  return tablas.find((t) => t.tabla?.hasInvalidPending()) ?? null;
}

/**
 * Guarda los pendientes de cada tabla **en serie y en el orden dado** (líneas antes que
 * pagos), para que el padre persista la cabecera recién cuando todo lo demás quedó
 * guardado. Completa al terminar; si una tabla falla, avisa con el mensaje del backend
 * (o el texto de la tabla) y emite el error sin tocar las siguientes.
 */
export function guardarTablasEnSerie<TTab extends string>(
  tablas: readonly TablaEnVivoDocumento<TTab>[],
  toast: ToastService,
): Observable<void> {
  return concat(
    ...tablas.map((t) =>
      defer(() => t.tabla?.saveAll() ?? of(undefined)).pipe(
        catchError((err: unknown) => {
          toast.error(t.errorAlGuardar.title, extractErrorMessage(err, t.errorAlGuardar.desc));
          return throwError(() => err);
        }),
      ),
    ),
  ).pipe(ignoreElements());
}

/** Lo que `registrarPagosDeAlta` necesita de la tabla de pagos. */
export interface TablaPagosDeAlta {
  rowCount(): number;
  saveAll(documentoId: number): Observable<void>;
}

/**
 * Alta de un documento que cobra: sus pagos no viajan embebidos, se registran contra el
 * documento recién creado. **Siempre completa**: si un pago falla el documento ya
 * existe, así que se avisa (con el motivo del backend si lo trae) y el padre sigue a la
 * ficha, desde donde se edita para agregarlos.
 */
export function registrarPagosDeAlta(
  pagos: TablaPagosDeAlta | undefined,
  documentoId: number,
  toast: ToastService,
  aviso: ToastTexto,
): Observable<void> {
  if (!pagos || pagos.rowCount() === 0) return of(undefined);
  return pagos.saveAll(documentoId).pipe(
    catchError((err: unknown) => {
      toast.warn(aviso.title, extractErrorMessage(err, aviso.desc));
      return of(undefined);
    }),
  );
}
