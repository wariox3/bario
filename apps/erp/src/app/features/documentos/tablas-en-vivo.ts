import type { FormGroup } from '@angular/forms';
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
 * `documento-detalle`, pagos de `documento-pago`): el form padre le pide que guarde
 * sus pendientes antes de guardar la cabecera.
 */
export interface TablaEnVivo {
  saveAll(): Observable<void>;
}

/** Una tabla del documento con su texto de error al guardar. */
export interface TablaEnVivoDocumento {
  /** `undefined` si la tabla no está montada o no aplica al documento (nota débito sin pagos). */
  readonly tabla: TablaEnVivo | undefined;
  /** Error cuando falla su guardado; la descripción se reemplaza por la del backend si viene. */
  readonly errorAlGuardar: ToastTexto;
}

/**
 * Pestaña que hay que abrir para mostrar el primer error del formulario, en orden de
 * pantalla. `libFocusInvalid` lleva al primer campo inválido del DOM, pero los paneles
 * inactivos de `p-tabs` están montados y ocultos (`hidden`): el campo existe, pero ni
 * se ve ni recibe foco hasta que se abre su pestaña.
 *
 * La cabecera va arriba de los tabs: si le falta algo devuelve `null` y no se cambia
 * de pestaña. Si no, devuelve la pestaña del primer control inválido según el orden de
 * `pestanas` (control del form → pestaña que lo contiene).
 */
export function pestanaConPrimerError<TTab extends string>(
  form: FormGroup,
  pestanas: Readonly<Record<string, TTab>>,
): TTab | null {
  const enCabecera = Object.entries(form.controls).some(
    ([nombre, control]) => !(nombre in pestanas) && control.invalid,
  );
  if (enCabecera) return null;
  const nombre = Object.keys(pestanas).find((n) => form.controls[n]?.invalid);
  return nombre ? pestanas[nombre] : null;
}

/**
 * Guarda los pendientes de cada tabla **en serie y en el orden dado** (líneas antes que
 * pagos), para que el padre persista la cabecera recién cuando todo lo demás quedó
 * guardado. Completa al terminar; si una tabla falla, avisa con el mensaje del backend
 * (o el texto de la tabla) y emite el error sin tocar las siguientes.
 */
export function guardarTablasEnSerie(
  tablas: readonly TablaEnVivoDocumento[],
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
