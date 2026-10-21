import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import type { AbstractControl, FormArray, FormControl } from '@angular/forms';
import {
  type Observable,
  catchError,
  concat,
  concatMap,
  defer,
  finalize,
  from,
  map,
  mergeMap,
  of,
  switchMap,
  tap,
  throwError,
  toArray,
} from 'rxjs';
import type { DocumentoDetalleService } from '@erp/core/module-config';

/**
 * Líneas que se escriben a la vez al guardar. Acota la ráfaga contra el backend en
 * documentos con muchas líneas (una importación grande) sin serializarlas todas.
 */
export const GUARDADOS_EN_PARALELO = 4;

/**
 * Se pidió guardar líneas mientras la misma tabla ya guarda otras. Un segundo lote
 * reenviaría líneas que siguen sin `id` y el documento quedaría con líneas duplicadas.
 */
export class LineasEnCursoError extends Error {
  constructor() {
    super('Ya hay un guardado de líneas en curso');
    this.name = 'LineasEnCursoError';
  }
}

/** Lo único que el guardado diferido lee de una fila además del estado del control. */
export type LineaGroup = AbstractControl & {
  readonly controls: { readonly id: FormControl<number | null> };
};

/** Cómo una tabla le explica sus filas a `LineasDiferidas`. */
export interface LineasDiferidasConfig<G extends LineaGroup, TRead> {
  /** `FormArray` de líneas del form padre. */
  readonly detalles: () => FormArray<G>;
  /** Id del documento en edición; `null` en alta, donde nada se guarda aparte. */
  readonly documentId: () => number | null;
  readonly service: DocumentoDetalleService;
  /**
   * Una fila nueva cuenta como pendiente solo con lo que la define (el ítem, la
   * cuenta). Recién agregada y vacía no hay nada que guardar ni perder.
   */
  readonly tieneContenido: (fila: G) => boolean;
  /** Cuerpo del POST/PATCH de la fila. */
  readonly payload: (fila: G) => object;
  /** Grupo nuevo armado con la línea que devolvió el backend. */
  readonly reconstruir: (leida: TRead) => G;
}

/** Cómo terminó una operación del guardado: el lote junta todas antes de decidir. */
type ResultadoGuardado = { readonly ok: true } | { readonly ok: false; readonly err: unknown };

/**
 * **Guardado diferido** de las líneas de un documento en edición. El backend no
 * acepta las líneas en el PUT del documento —van por `/documento-detalle`—, pero la
 * tabla no escribe nada por su cuenta: altas, ediciones y bajas quedan pendientes en
 * memoria y las persiste `guardar()` cuando el form padre guarda el documento. Un
 * solo botón "Guardar" confirma todo; "Volver" lo descarta.
 *
 * Lo comparten las tablas de líneas (comercial y contable): cada una le dice cómo
 * leer, enviar y reconstruir sus filas, y se queda con la UI.
 */
export class LineasDiferidas<G extends LineaGroup, TRead> {
  /**
   * Ids de líneas persistidas que la persona quitó. La fila sale de la tabla al
   * instante (y del total), pero el `DELETE` espera al guardado del documento.
   */
  private readonly eliminadas = signal<readonly number[]>([]);

  private readonly guardandoSignal = signal(false);

  /** Hay un guardado en curso. */
  readonly guardando = this.guardandoSignal.asReadonly();

  constructor(private readonly config: LineasDiferidasConfig<G, TRead>) {}

  /** La fila tiene cambios sin guardar: nueva con contenido, o persistida y editada. */
  esPendiente(fila: G): boolean {
    // En alta no hay persistencia por línea: las líneas viajan con el documento.
    if (this.config.documentId() == null) return false;
    return fila.controls.id.value == null ? this.config.tieneContenido(fila) : fila.dirty;
  }

  /** Nº de cambios sin guardar: filas nuevas o editadas más las quitadas. */
  pendingCount(): number {
    return this.filasPendientes().length + this.eliminadas().length;
  }

  /** `true` si alguna fila pendiente está incompleta; el guardado la salta. */
  hayIncompletas(): boolean {
    return this.filasPendientes().some((fila) => fila.invalid);
  }

  /**
   * Quita la fila. Si ya existe en el backend (edición), su id pasa a `eliminadas`
   * y el `DELETE` se hace al guardar el documento.
   */
  quitar(fila: G): void {
    this.marcarBaja(fila);
    const i = this.filas().indexOf(fila);
    if (i >= 0) this.config.detalles().removeAt(i);
  }

  /** Quita todas las filas (p. ej. para reemplazarlas por las de otro documento). */
  quitarTodas(): void {
    for (const fila of this.filas()) this.marcarBaja(fila);
    this.config.detalles().clear();
  }

  /**
   * Persiste todos los cambios pendientes: primero las bajas, después las altas y
   * ediciones válidas. Completa cuando todo quedó escrito y emite error si algo
   * falló.
   *
   * **Reintentable sin duplicar.** Cada operación corre hasta el final aunque otra
   * falle (no se cancela nada en vuelo: una petición cancelada puede haber llegado
   * al backend y el reintento la duplicaría). Lo que se guardó deja de estar
   * pendiente —la fila se reconstruye con su `id`, la baja sale de `eliminadas`—,
   * así que volver a guardar solo envía lo que faltó. El backend no ofrece un
   * guardado atómico de documento + líneas.
   *
   * Límite: si un POST llega al backend pero su respuesta se pierde (corte de red),
   * la fila queda sin `id` y el reintento la crea otra vez. Evitarlo pide una clave
   * de idempotencia del lado del backend; desde aquí solo se minimiza no cancelando.
   *
   * Operación pura: no muestra toasts (el feedback es del caller).
   */
  guardar(): Observable<void> {
    // `defer`: el flag de carga y las peticiones se atan al `subscribe`, no a la
    // llamada, y las filas se evalúan en el momento de ejecutar.
    return defer(() => {
      if (this.guardandoSignal()) return throwError(() => new LineasEnCursoError());
      const documentoId = this.config.documentId();
      if (documentoId == null) return of(undefined);
      const bajas = [...this.eliminadas()];
      const filas = this.filasPendientes().filter((fila) => fila.valid);
      if (bajas.length === 0 && filas.length === 0) return of(undefined);

      // Cada operación entrega su resultado en vez de cortar el lote con su error.
      const resultado = (op: Observable<unknown>): Observable<ResultadoGuardado> =>
        op.pipe(
          map((): ResultadoGuardado => ({ ok: true })),
          catchError((err: unknown) => of<ResultadoGuardado>({ ok: false, err })),
        );

      this.guardandoSignal.set(true);
      return concat(
        from(bajas).pipe(concatMap((id) => resultado(this.persistirBaja(id)))),
        from(filas).pipe(
          mergeMap(
            (fila) => resultado(this.persistirFila(fila, documentoId)),
            GUARDADOS_EN_PARALELO,
          ),
        ),
      ).pipe(
        toArray(),
        switchMap((resultados) => {
          const fallo = resultados.find((r) => !r.ok);
          return fallo && !fallo.ok ? throwError(() => fallo.err) : of(undefined);
        }),
        finalize(() => this.guardandoSignal.set(false)),
      );
    });
  }

  /**
   * Filas del array. `FormArray<G>.controls` cae a `AbstractControl[]` mientras `G`
   * es genérico (el tipado de Angular lo resuelve con un condicional); el array solo
   * contiene `G`, así que el cast no pierde nada.
   */
  private filas(): readonly G[] {
    return this.config.detalles().controls as readonly G[];
  }

  private filasPendientes(): readonly G[] {
    return this.filas().filter((fila) => this.esPendiente(fila));
  }

  private marcarBaja(fila: G): void {
    const id = fila.controls.id.value;
    if (this.config.documentId() != null && id != null) {
      this.eliminadas.update((ids) => (ids.includes(id) ? ids : [...ids, id]));
    }
  }

  /**
   * Persiste una fila (PATCH si ya tiene `id`, POST con el documento si es nueva) y
   * la reconstruye desde la respuesta autoritativa del backend. Reconstruida, deja
   * de estar pendiente.
   *
   * Si la fila cambió mientras la petición viajaba (la persona siguió tecleando, o
   * llegó tarde un dato del ítem), no se reconstruye: pisaría lo nuevo. Solo toma el
   * `id` —para que el próximo guardado sea un PATCH y no otra alta— y queda
   * pendiente con lo que muestra la pantalla.
   */
  private persistirFila(fila: G, documentoId: number): Observable<TRead> {
    const payload = this.config.payload(fila);
    const enviado = JSON.stringify(payload);
    const id = fila.controls.id.value;
    const op =
      id != null
        ? this.config.service.actualizar<TRead>(id, payload)
        : this.config.service.crear<TRead>(documentoId, payload);
    return op.pipe(
      tap((guardada) => {
        const nueva = this.config.reconstruir(guardada);
        if (JSON.stringify(this.config.payload(fila)) !== enviado) {
          fila.controls.id.setValue(nueva.controls.id.value);
          fila.markAsDirty();
          return;
        }
        const index = this.filas().indexOf(fila);
        if (index >= 0) this.config.detalles().setControl(index, nueva);
      }),
    );
  }

  /**
   * Borra una línea quitada y la saca de `eliminadas`. Un 404 cuenta como hecho: la
   * línea ya no existe (p. ej. la borró un intento anterior cuya respuesta se perdió).
   */
  private persistirBaja(id: number): Observable<void> {
    const hecho = (): void => this.eliminadas.update((ids) => ids.filter((x) => x !== id));
    return this.config.service.eliminar(id).pipe(
      tap(hecho),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          hecho();
          return of(undefined);
        }
        return throwError(() => err);
      }),
    );
  }
}
