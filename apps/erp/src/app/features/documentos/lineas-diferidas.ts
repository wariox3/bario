import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import {
  type AbstractControl,
  type FormArray,
  type FormControl,
  PristineChangeEvent,
  TouchedChangeEvent,
} from '@angular/forms';
import {
  type Observable,
  catchError,
  concat,
  concatMap,
  defer,
  filter,
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
import { reemplazarFilas } from './form-array-filas';

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

/**
 * Cambios de las filas que **no** mueven su valor: tocado y sucio/limpio. Una tabla
 * `OnPush` los necesita aparte de `valueChanges`, porque los dispara alguien de
 * afuera sin pasar por un signal:
 *
 * - el form padre, al intentar guardar en blanco: `libFocusInvalid` hace
 *   `markAllAsTouched()` y las filas incompletas tienen que pintarse en rojo;
 * - el guardado, que marca sucia una fila que cambió mientras viajaba
 *   (`persistirFila`), y el padre, que limpia todo al guardar.
 *
 * Los eventos de cada fila suben por `events` del `FormArray`.
 */
export function cambiosDeEstado(array: AbstractControl): Observable<unknown> {
  return array.events.pipe(
    filter((e) => e instanceof TouchedChangeEvent || e instanceof PristineChangeEvent),
  );
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
  /**
   * Avisa cada línea que el backend confirmó, aunque el resto del lote falle. La
   * tabla paginada lo usa para mover el resumen guardado: lo escrito ya cuenta en
   * el documento.
   */
  readonly alGuardar?: (cambio: LineaGuardada<TRead>) => void;
}

/** Una línea que quedó escrita (alta o edición) o borrada en el backend. */
export type LineaGuardada<TRead> =
  | { readonly tipo: 'escrita'; readonly id: number; readonly leida: TRead }
  | { readonly tipo: 'borrada'; readonly id: number };

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

  /**
   * Filas persistidas con cambios sin guardar que no están en la página visible.
   * Con la tabla paginada, cambiar de página reemplaza las filas del array; las
   * editadas se guardan acá con su grupo vivo y vuelven a la tabla al regresar a
   * su página (`mostrarPagina`). Sin paginar queda siempre vacío.
   */
  private readonly fuera = signal<ReadonlyMap<number, G>>(new Map());

  private readonly guardandoSignal = signal(false);

  /** Hay un guardado en curso. */
  readonly guardando = this.guardandoSignal.asReadonly();

  /** Ids de las líneas persistidas quitadas, pendientes de borrar. */
  readonly bajas = this.eliminadas.asReadonly();

  /** Filas editadas que no están en la página visible (ver `fuera`). */
  readonly fueraDePagina = computed(() => [...this.fuera().values()]);

  constructor(private readonly config: LineasDiferidasConfig<G, TRead>) {}

  /** La fila tiene cambios sin guardar: nueva con contenido, o persistida y editada. */
  esPendiente(fila: G): boolean {
    // En alta no hay persistencia por línea: las líneas viajan con el documento.
    if (this.config.documentId() == null) return false;
    return fila.controls.id.value == null ? this.config.tieneContenido(fila) : fila.dirty;
  }

  /** Nº de cambios sin guardar: filas nuevas o editadas más las quitadas. */
  pendingCount(): number {
    return this.pendientes().length + this.eliminadas().length;
  }

  /** `true` si alguna fila pendiente está incompleta; el guardado la salta. */
  hayIncompletas(): boolean {
    return this.pendientes().some((fila) => fila.invalid);
  }

  /**
   * Filas con cambios sin guardar, estén o no en la página visible (no incluye
   * las quitadas).
   */
  pendientes(): readonly G[] {
    return [...this.filas(), ...this.fuera().values()].filter((fila) => this.esPendiente(fila));
  }

  /**
   * Muestra una página de líneas leídas del backend. El array queda con las de la
   * página (menos las quitadas) y, al final, las nuevas sin guardar, que se ven en
   * todas las páginas. Una fila editada que sale de la vista pasa a `fuera` y, si
   * la página trae su id, vuelve con sus cambios en vez de reconstruirse.
   */
  mostrarPagina(leidas: readonly TRead[]): void {
    const fuera = new Map(this.fuera());
    const nuevas: G[] = [];
    for (const fila of this.filas()) {
      const id = fila.controls.id.value;
      if (id == null) nuevas.push(fila);
      else if (this.esPendiente(fila)) fuera.set(id, fila);
    }
    const bajas = new Set(this.eliminadas());
    const pagina: G[] = [];
    for (const leida of leidas) {
      const fila = this.config.reconstruir(leida);
      const id = fila.controls.id.value;
      if (id != null && bajas.has(id)) continue;
      const viva = id != null ? fuera.get(id) : undefined;
      if (viva && id != null) fuera.delete(id);
      pagina.push(viva ?? fila);
    }
    this.fuera.set(fuera);
    reemplazarFilas(this.config.detalles(), [...pagina, ...nuevas]);
  }

  /**
   * Marca como quitadas líneas persistidas que no están en la tabla (las de otras
   * páginas), p. ej. para reemplazar todas las líneas del documento.
   */
  marcarBajas(ids: readonly number[]): void {
    if (this.config.documentId() == null || ids.length === 0) return;
    this.eliminadas.update((actuales) => [...new Set([...actuales, ...ids])]);
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
    for (const fila of [...this.filas(), ...this.fuera().values()]) this.marcarBaja(fila);
    this.fuera.set(new Map());
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
      const filas = this.pendientes().filter((fila) => fila.valid);
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
        const nuevoId = nueva.controls.id.value;
        if (nuevoId != null)
          this.config.alGuardar?.({ tipo: 'escrita', id: nuevoId, leida: guardada });
        if (JSON.stringify(this.config.payload(fila)) !== enviado) {
          fila.controls.id.setValue(nuevoId);
          fila.markAsDirty();
          return;
        }
        const index = this.filas().indexOf(fila);
        if (index >= 0) this.config.detalles().setControl(index, nueva);
        else if (id != null) this.sacarDeFuera(id);
      }),
    );
  }

  /** Una fila de otra página ya quedó guardada: al volver a ella se lee del backend. */
  private sacarDeFuera(id: number): void {
    if (!this.fuera().has(id)) return;
    const fuera = new Map(this.fuera());
    fuera.delete(id);
    this.fuera.set(fuera);
  }

  /**
   * Borra una línea quitada y la saca de `eliminadas`. Un 404 cuenta como hecho: la
   * línea ya no existe (p. ej. la borró un intento anterior cuya respuesta se perdió).
   */
  private persistirBaja(id: number): Observable<void> {
    const hecho = (): void => {
      this.eliminadas.update((ids) => ids.filter((x) => x !== id));
      this.config.alGuardar?.({ tipo: 'borrada', id });
    };
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
