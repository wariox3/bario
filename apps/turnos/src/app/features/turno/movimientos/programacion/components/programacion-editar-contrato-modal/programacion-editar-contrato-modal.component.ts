import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { finalize, type Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { I18nService, ToastService, formatHorario, fromIsoDate } from '@reddoc/core';
import type { AppDict } from '@turnos/i18n';
import { UppercaseDirective } from '@reddoc/ui';
import type { ProgramacionContratoRef } from '../programacion-grid/programacion-grid.component';
import { ProgramacionService } from '../../programacion.service';
import type {
  ActualizarProgramacionPayload,
  ProgramacionErrorItem,
  ProgramacionFecha,
  ProgramacionFila,
} from '../../programacion.model';
import {
  extraerDetalleProgramacion,
  extraerErroresMasivo,
  extraerErroresProgramacion,
  separarErroresProgramacion,
} from '../../programacion-errores.util';

/**
 * Celda editable de un día: metadatos para pintar/aria + el `FormControl` real. El
 * template ata `[formControl]="control"` (no por índice) para que, al reconstruir el
 * form, el `@for` revincule los inputs a las instancias nuevas por identidad.
 */
interface DiaControlVm {
  readonly clave: string;
  readonly etiqueta: string;
  readonly inicial: string;
  readonly control: FormControl<string>;
}

/**
 * Banda de un puesto (línea) del contrato en el grid editable: metadatos a la
 * izquierda (puesto + modalidad + horario) más sus celdas de día con control.
 */
interface BandaVm {
  readonly documentoDetalleId: number;
  readonly puestoId: number | null;
  readonly puestoNombre: string | null;
  readonly modalidadNombre: string | null;
  readonly horario: string | null;
  readonly dias: readonly DiaControlVm[];
}

/**
 * Modo de guardado del modal:
 *  - `'linea'`: una sola fila → `POST actualizar` (payload single).
 *  - `'masivo'`: todas las líneas del contrato → `POST actualizar-masivo`
 *    (un request con `programaciones: []`).
 */
export type EditarProgramacionModo = 'linea' | 'masivo';

/**
 * Errores del 400 repartidos por alcance:
 *  - `celdas`: `documento_detalle_id → (día → mensaje)` para resaltar la casilla.
 *  - `avisos`: `documento_detalle_id → mensajes[]` de puesto sin fecha (ej. horas
 *    excedidas) atribuidos a una línea.
 *  - `globales`: mensajes de validación del batch no atribuibles a un puesto (masivo
 *    con `{ errores }` de nivel superior, sin `indice`).
 */
interface ErroresPorPuesto {
  readonly celdas: Map<number, ReadonlyMap<string, string>>;
  readonly avisos: Map<number, readonly string[]>;
  readonly globales: string[];
}

function nuevoErroresPorPuesto(): ErroresPorPuesto {
  return { celdas: new Map(), avisos: new Map(), globales: [] };
}

/**
 * Modal para **editar la programación de un contrato en todos sus puestos a la vez**.
 *
 * Se abre desde el botón de editar del grid. Lista una banda por puesto (una línea
 * del contrato) con sus días **editables**, pre-llenados con los turnos actuales, y
 * guarda con una llamada `POST actualizar` por puesto (`forkJoin`). Las
 * `fechas` y las `filas` (ya filtradas por contrato) llegan del detalle, así que no
 * hay HTTP de carga. Al éxito total emite `applied` para que el padre recargue.
 */
@Component({
  selector: 'app-programacion-editar-contrato-modal',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, UppercaseDirective],
  templateUrl: './programacion-editar-contrato-modal.component.html',
  styleUrl: './programacion-editar-contrato-modal.component.scss',
})
export class ProgramacionEditarContratoModalComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(ProgramacionService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Visibilidad del modal (two-way con el padre). */
  readonly visible = model<boolean>(false);

  /** Contrato en edición (identidad). `null` cuando el modal está cerrado. */
  readonly contrato = input<ProgramacionContratoRef | null>(null);

  /**
   * Modo de guardado: `'linea'` (una fila, endpoint single) o `'masivo'` (todas las
   * líneas del contrato, endpoint masivo). Determina el endpoint en `onGuardar`.
   */
  readonly modo = input<EditarProgramacionModo>('masivo');

  /** Columnas de día del mes (compartidas por todos los puestos de la programación). */
  readonly fechas = input<readonly ProgramacionFecha[]>([]);

  /** Líneas del contrato (una por puesto) que se editan juntas. */
  readonly filas = input<readonly ProgramacionFila[]>([]);

  /** Claves ISO de fechas festivas — para resaltar columnas en el header. */
  readonly festivoClaves = input<ReadonlySet<string>>(new Set());

  /** Se emite tras guardar todos los puestos con éxito; el padre recarga el detalle. */
  readonly applied = output<void>();

  /**
   * Form: un `FormArray` de días (código de turno por día) por puesto, en el mismo
   * orden que `filas()`. Los metadatos de cada puesto para la banda van en
   * `puestosView` (paralelo por índice).
   */
  protected readonly form = this.fb.group({
    puestos: this.fb.array<FormArray<FormControl<string>>>([]),
  });

  protected get puestosArray(): FormArray<FormArray<FormControl<string>>> {
    return this.form.controls.puestos;
  }

  /**
   * Se incrementa dentro del `effect` tras (re)construir el form. `bandas` depende de
   * este signal para recomputar con los controles frescos: los effects corren tras el
   * render, así que sin este gatillo `bandas` leería controles viejos/vacíos.
   */
  private readonly estructuraVersion = signal(0);

  /**
   * Bandas del grid: metadatos del puesto + celdas de día con su `FormControl` real.
   * Empareja `filas()`/`fechas()` con `puestosArray` (mismo orden). El template ata
   * `[formControl]="dia.control"` y hace `track dia.control`, de modo que al recrear
   * los controles el `@for` revincula los inputs por identidad (sin desfase).
   */
  protected readonly bandas = computed<readonly BandaVm[]>(() => {
    this.estructuraVersion();
    const filas = this.filas();
    const fechas = this.fechas();
    const arr = this.puestosArray;
    if (arr.length !== filas.length) return [];

    return filas.map((fila, i) => {
      const dias = arr.at(i);
      return {
        documentoDetalleId: fila.documento_detalle_id,
        puestoId: fila.puesto_id,
        puestoNombre: fila.puesto_nombre,
        modalidadNombre: fila.modalidad_nombre,
        horario: formatHorario(fila.hora_desde, fila.hora_hasta),
        dias: fechas.map((fecha, j) => ({
          clave: fecha.clave,
          etiqueta: fecha.etiqueta,
          inicial: fecha.inicial,
          control: dias.at(j),
        })),
      };
    });
  });

  /** Columnas totales de la tabla: solo los días (sin columna de empleado). */
  protected readonly colspan = computed(() => this.fechas().length);

  /** Etiqueta del mes (de la primera fecha), para el subtítulo del header. */
  protected readonly periodoEtiqueta = computed<string | null>(() => {
    const first = this.fechas()[0];
    const date = first ? fromIsoDate(first.clave) : null;
    return date ? date.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) : null;
  });

  protected readonly isSubmitting = signal(false);

  /**
   * Casillas en error tras guardar, con scope de puesto: `documento_detalle_id →
   * (fecha ISO → mensaje)`. Se alimentan de los `errores` del 400 de cada puesto y
   * resaltan la celda con su tooltip hasta que el usuario corrige.
   */
  protected readonly celdasError = signal<ReadonlyMap<number, ReadonlyMap<string, string>>>(
    new Map(),
  );

  /** Mensaje de error de la casilla (puesto + día), o `null` si no tiene. */
  protected errorCelda(documentoDetalleId: number, clave: string): string | null {
    return this.celdasError().get(documentoDetalleId)?.get(clave) ?? null;
  }

  /**
   * Avisos a nivel de **puesto** tras guardar: `documento_detalle_id → mensajes[]`.
   * Se alimentan de los errores del 400 sin `fecha` (ej. horas excedidas) y se muestran
   * bajo la banda del puesto hasta que el usuario corrige.
   */
  protected readonly avisosPuesto = signal<ReadonlyMap<number, readonly string[]>>(new Map());

  /**
   * Avisos de validación del batch no atribuibles a un puesto (masivo con `{ errores }`
   * de nivel superior). Se muestran en un banner arriba del modal.
   */
  protected readonly avisosGlobales = signal<readonly string[]>([]);

  /** Mensajes de nivel puesto (sin fecha) de un `documento_detalle_id`; `[]` si no hay. */
  protected avisosDe(documentoDetalleId: number): readonly string[] {
    return this.avisosPuesto().get(documentoDetalleId) ?? [];
  }

  /**
   * Versión de los valores del form. Se incrementa en cada `valueChanges` para
   * disparar el recálculo de `conflictos` sin suscripciones por celda (el `computed`
   * lee los controles de forma imperativa; este signal es su gatillo al teclear).
   */
  private readonly valoresVersion = signal(0);

  /**
   * Celdas en conflicto por la regla "un turno por día entre puestos": si en una
   * fecha ≥2 puestos tienen código no vacío, esas celdas se marcan. Clave
   * `` `${documento_detalle_id}|${fecha ISO}` ``. Una sola pasada O(días × puestos),
   * memoizada; recalcula al teclear (`valoresVersion`) o al cambiar la estructura.
   */
  protected readonly conflictos = computed<ReadonlySet<string>>(() => {
    this.valoresVersion();
    const filas = this.filas();
    const fechas = this.fechas();
    const puestos = this.puestosArray;
    if (puestos.length !== filas.length) return new Set();

    const conflicto = new Set<string>();
    for (let j = 0; j < fechas.length; j++) {
      const llenos: number[] = [];
      for (let i = 0; i < filas.length; i++) {
        if (puestos.at(i).at(j).value.trim()) llenos.push(i);
      }
      if (llenos.length >= 2) {
        const clave = fechas[j].clave;
        for (const i of llenos) conflicto.add(`${filas[i].documento_detalle_id}|${clave}`);
      }
    }
    return conflicto;
  });

  /** `true` si la casilla (puesto + día) choca con otro puesto la misma fecha. */
  protected conflictoCelda(documentoDetalleId: number, clave: string): boolean {
    return this.conflictos().has(`${documentoDetalleId}|${clave}`);
  }

  /**
   * Solo se puede guardar con líneas cargadas, sin conflictos de "un turno por día
   * entre puestos" y sin envío en curso. Reactivo: se rehabilita al corregir la
   * casilla en conflicto.
   */
  protected readonly puedeGuardar = computed(
    () => this.filas().length > 0 && this.conflictos().size === 0 && !this.isSubmitting(),
  );

  constructor() {
    // Reconstruye el form (un FormArray de días por puesto) cuando cambian las filas
    // del contrato o las fechas del mes. Pre-llena cada día con su turno actual.
    // `emitEvent: false` para no disparar el valueChanges que limpia los errores.
    effect(() => {
      const filas = this.filas();
      const fechas = this.fechas();
      const arr = this.puestosArray;
      arr.clear({ emitEvent: false });
      for (const fila of filas) {
        const dias = this.fb.array<FormControl<string>>([]);
        for (const fecha of fechas) {
          dias.push(this.fb.control(fila.dias[fecha.clave]?.turno_codigo ?? ''), {
            emitEvent: false,
          });
        }
        arr.push(dias, { emitEvent: false });
      }
      // Nuevo contrato/mes: limpia los errores (celda, puesto y globales) de un guardado anterior.
      this.celdasError.set(new Map());
      this.avisosPuesto.set(new Map());
      this.avisosGlobales.set([]);
      // El pre-llenado usa `emitEvent: false`, así que `valueChanges` NO dispara.
      // Se bumpean las versiones a mano contra el form recién reconstruido:
      //  - `valoresVersion` → `conflictos` (lee los controles imperativamente).
      //  - `estructuraVersion` → `bandas` recompute con los controles frescos, para que
      //    el template revincule los inputs a las instancias nuevas por identidad.
      this.valoresVersion.update((v) => v + 1);
      this.estructuraVersion.update((v) => v + 1);
    });

    // Al tocar cualquier casilla: bumpea la versión (recalcula conflictos) y retira
    // los errores del backend (celda y puesto).
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.valoresVersion.update((v) => v + 1);
      if (this.celdasError().size) this.celdasError.set(new Map());
      if (this.avisosPuesto().size) this.avisosPuesto.set(new Map());
      if (this.avisosGlobales().length) this.avisosGlobales.set([]);
    });
  }

  /**
   * Guarda la programación editada. Arma un payload por fila y, según el `modo`,
   * dispara una sola llamada: `actualizar` (una línea) o
   * `actualizar-masivo` (todas las líneas del contrato). Al éxito cierra
   * y avisa al padre; al error mantiene el modal abierto y muestra un toast (en
   * `'linea'` además resalta las celdas del 400).
   */
  protected onGuardar(): void {
    const contrato = this.contrato();
    const filas = this.filas();
    const fechas = this.fechas();
    if (!contrato || filas.length === 0 || this.isSubmitting()) return;

    const payloads = filas.map(
      (fila, i): ActualizarProgramacionPayload => ({
        contrato_id: contrato.id,
        documento_detalle_id: fila.documento_detalle_id,
        items: fechas.map((fecha, j) => ({
          fecha: fecha.clave,
          turno_codigo: this.puestosArray.at(i).at(j).value.trim() || null,
        })),
      }),
    );

    // Los dos endpoints devuelven shapes distintos (resumen por línea vs `resultados[]`),
    // pero acá solo interesa éxito/error → se unifica como `Observable<unknown>`.
    const request$: Observable<unknown> =
      this.modo() === 'masivo'
        ? this.service.actualizarProgramacionMasivo({ programaciones: payloads })
        : this.service.actualizarProgramacion(payloads[0]);

    this.isSubmitting.set(true);
    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => this.onGuardadoExitoso(),
        error: (err: unknown) => this.onGuardadoError(err, payloads),
      });
  }

  /** Cierra el modal, avisa al padre para que recargue y muestra el toast de éxito. */
  private onGuardadoExitoso(): void {
    const ts = this.t().entities.programacion.detail.programacionModal.toasts;
    this.toast.success(ts.success.title, ts.success.desc);
    this.applied.emit();
    this.visible.set(false);
  }

  /**
   * Deja el modal abierto, aplica los errores del 400 y muestra un toast. Separa por
   * alcance: celdas (`documento_detalle_id → fecha → mensaje`) y avisos de puesto
   * (`documento_detalle_id → mensajes[]`, errores sin `fecha`). El 400 difiere por modo:
   * `'linea'` trae `{ errores: [] }` (una fila); `'masivo'` trae
   * `{ resultados: [{ indice, errores }] }` con el `indice` mapeado a `payloads[indice]`.
   */
  private onGuardadoError(err: unknown, payloads: readonly ActualizarProgramacionPayload[]): void {
    const ts = this.t().entities.programacion.detail.programacionModal.toasts;
    const { celdas, avisos, globales } =
      this.modo() === 'masivo'
        ? this.parseErroresMasivo(err, payloads)
        : this.parseErroresLinea(err, payloads[0]);
    this.celdasError.set(celdas);
    this.avisosPuesto.set(avisos);
    this.avisosGlobales.set(globales);
    // Si el 400 no trajo celdas/avisos pero sí un `detail`, se muestra ese mensaje.
    const huboDetalle = celdas.size > 0 || avisos.size > 0 || globales.length > 0;
    const desc = huboDetalle ? ts.error.desc : (extraerDetalleProgramacion(err) ?? ts.error.desc);
    this.toast.error(ts.error.title, desc);
  }

  /**
   * 400 de `actualizar` (`{ errores: [] }`) → celdas y avisos de puesto de
   * la única fila enviada, keyed por su `documento_detalle_id`.
   */
  private parseErroresLinea(
    err: unknown,
    payload: ActualizarProgramacionPayload,
  ): ErroresPorPuesto {
    const acc = nuevoErroresPorPuesto();
    const body = extraerErroresProgramacion(err);
    if (body) this.acumularErrores(acc, payload.documento_detalle_id, body.errores);
    return acc;
  }

  /**
   * 400 de `actualizar-masivo`. Dos formas posibles:
   *  - `{ resultados: [{ indice, errores }] }` → celdas/avisos por línea, resolviendo el
   *    `documento_detalle_id` desde `payloads[indice]`.
   *  - `{ detail, errores: [] }` → validación global del batch (sin `indice`, ej. horas
   *    excedidas): no atribuible a un puesto → van a `globales` (banner arriba).
   */
  private parseErroresMasivo(
    err: unknown,
    payloads: readonly ActualizarProgramacionPayload[],
  ): ErroresPorPuesto {
    const acc = nuevoErroresPorPuesto();
    const masivo = extraerErroresMasivo(err);
    if (masivo) {
      for (const linea of masivo.resultados) {
        const payload = payloads[linea.indice];
        if (!payload || !Array.isArray(linea.errores)) continue;
        this.acumularErrores(acc, payload.documento_detalle_id, linea.errores);
      }
      return acc;
    }
    const global = extraerErroresProgramacion(err);
    if (global) for (const e of global.errores) acc.globales.push(e.mensaje);
    return acc;
  }

  /**
   * Reparte los `errores` de un puesto en el acumulador: con `fecha` → celda
   * (`documento_detalle_id → fecha → mensaje`); sin `fecha` → aviso de puesto.
   */
  private acumularErrores(
    acc: ErroresPorPuesto,
    documentoDetalleId: number,
    errores: readonly ProgramacionErrorItem[],
  ): void {
    const { celdas, avisos } = separarErroresProgramacion(errores);
    if (celdas.size) acc.celdas.set(documentoDetalleId, celdas);
    if (avisos.length) acc.avisos.set(documentoDetalleId, avisos);
  }

  protected onClose(): void {
    this.visible.set(false);
  }
}
