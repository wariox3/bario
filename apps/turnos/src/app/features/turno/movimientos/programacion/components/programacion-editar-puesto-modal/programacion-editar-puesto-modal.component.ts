import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormArray,
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { I18nService, ToastService, formatHorario, fromIsoDate } from '@reddoc/core';
import type { AppDict } from '@turnos/i18n';
import { UppercaseDirective } from '@reddoc/ui';
import type { ProgramacionGrupoRef } from '../programacion-grid/programacion-grid.component';
import { ProgramacionService } from '../../programacion.service';
import type {
  ActualizarProgramacionPayload,
  ProgramacionErrorItem,
  ProgramacionFecha,
  ProgramacionFila,
  ProgramacionVigencia,
} from '../../programacion.model';
import {
  esColumnaFestiva,
  esColumnaSabado,
  estaEnVigencia,
  formatVigenciaRango,
  localeDe,
  vigenciaDe,
} from '../../programacion.utils';
import { ProgramacionVigenciasStore } from '../../programacion-vigencias.store';
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
  /** `true` si el día cae fuera de la vigencia de la banda (input bloqueado). */
  readonly bloqueado: boolean;
}

/**
 * Banda de un **contrato** (línea) del puesto en el grid editable: metadatos a la
 * izquierda (nombre + identificación del contrato) más sus celdas de día con control.
 * Es el eje transpuesto del modal de contrato (allí la banda es un puesto). Cada
 * banda tiene su **propia vigencia** (rango de la línea): los días fuera se bloquean.
 */
interface BandaVm {
  /** `contrato_id` — identidad única de la banda en este eje (para keyear errores). */
  readonly key: number;
  readonly contratoId: number;
  readonly contratoNombre: string | null;
  readonly identificacion: string | null;
  /** Rango de vigencia formateado (`15 de jul - 31 de jul`) o `null` si la línea no lo trae. */
  readonly rangoEtiqueta: string | null;
  readonly dias: readonly DiaControlVm[];
}

/**
 * Errores del 400 repartidos por alcance, keyed por `contrato_id`:
 *  - `celdas`: `contrato_id → (día → mensaje)` para resaltar la casilla.
 *  - `avisos`: `contrato_id → mensajes[]` de línea sin fecha (ej. horas excedidas).
 *  - `globales`: mensajes de validación del batch no atribuibles a un contrato.
 */
interface ErroresPorContrato {
  readonly celdas: Map<number, ReadonlyMap<string, string>>;
  readonly avisos: Map<number, readonly string[]>;
  readonly globales: string[];
}

function nuevoErroresPorContrato(): ErroresPorContrato {
  return { celdas: new Map(), avisos: new Map(), globales: [] };
}

/**
 * Modal para **editar la programación de todos los contratos de un puesto a la vez**.
 *
 * Se abre desde el nombre del puesto en la banda de agrupación del grid. Lista una
 * banda por contrato (una línea del puesto) con sus días **editables**, pre-llenados
 * con los turnos actuales, y guarda con una única llamada
 * `POST actualizar-masivo` (una entrada por contrato). Las `fechas` y las
 * `filas` (ya filtradas por puesto) llegan del detalle, así que no hay HTTP de carga.
 * Al éxito emite `applied` para que el padre recargue.
 *
 * A diferencia del modal de contrato, **no aplica regla de conflicto cliente-side**:
 * varios contratos pueden cubrir el mismo puesto el mismo día (diurno/nocturno,
 * cobertura 24/7). El backend valida excesos y devuelve avisos.
 */
@Component({
  selector: 'app-programacion-editar-puesto-modal',
  standalone: true,
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, InputTextModule, UppercaseDirective],
  templateUrl: './programacion-editar-puesto-modal.component.html',
  styleUrl: './programacion-editar-puesto-modal.component.scss',
  providers: [ProgramacionVigenciasStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramacionEditarPuestoModalComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(ProgramacionService);
  private readonly vigenciasStore = inject(ProgramacionVigenciasStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Reglas de resaltado de columna (festivo/sábado), compartidas — ver utils. */
  protected readonly esColumnaFestiva = esColumnaFestiva;
  protected readonly esColumnaSabado = esColumnaSabado;

  /** Visibilidad del modal (two-way con el padre). */
  readonly visible = model<boolean>(false);

  /** Puesto en edición (identidad). `null` cuando el modal está cerrado. */
  readonly puesto = input<ProgramacionGrupoRef | null>(null);

  /** Columnas de día del mes (compartidas por todos los contratos de la programación). */
  readonly fechas = input<readonly ProgramacionFecha[]>([]);

  /** Líneas del puesto (una por contrato) que se editan juntas. */
  readonly filas = input<readonly ProgramacionFila[]>([]);

  /** Claves ISO de fechas festivas — para resaltar columnas en el header. */
  readonly festivoClaves = input<ReadonlySet<string>>(new Set());

  /** Se emite tras guardar con éxito; el padre recarga el detalle. */
  readonly applied = output<void>();

  /**
   * Form: un `FormArray` de días (código de turno por día) por contrato, en el mismo
   * orden que `filas()`. Los metadatos de cada contrato para la banda van en `bandas`
   * (paralelo por índice).
   */
  protected readonly form = this.fb.group({
    contratos: this.fb.array<FormArray<FormControl<string>>>([]),
  });

  protected get contratosArray(): FormArray<FormArray<FormControl<string>>> {
    return this.form.controls.contratos;
  }

  /**
   * Se incrementa dentro del `effect` tras (re)construir el form. `bandas` depende de
   * este signal para recomputar con los controles frescos: los effects corren tras el
   * render, así que sin este gatillo `bandas` leería controles viejos/vacíos.
   */
  private readonly estructuraVersion = signal(0);

  /**
   * Vigencia **efectiva** por línea (`documento_detalle_id → rango`): la de la fila
   * si el detalle del grid ya la trae (`fecha_desde`/`fecha_hasta`), con fallback a
   * la cargada por línea (`ProgramacionVigenciasStore`, GET por id — el detalle hoy
   * no incluye las fechas). `null` = sin rango → todos los días habilitados.
   */
  protected readonly vigenciasPorLinea = computed<ReadonlyMap<number, ProgramacionVigencia | null>>(
    () => {
      const cargadas = this.vigenciasStore.vigencias();
      const map = new Map<number, ProgramacionVigencia | null>();
      for (const fila of this.filas()) {
        map.set(
          fila.documento_detalle_id,
          vigenciaDe(fila.fecha_desde, fila.fecha_hasta) ??
            cargadas.get(fila.documento_detalle_id) ??
            null,
        );
      }
      return map;
    },
  );

  /**
   * Vigencia **única** del puesto: todas las bandas comparten la línea
   * (`documento_detalle_id` — un puesto, varios contratos), así que acá el bloqueo
   * es uniforme por columna y el header también puede marcarse (a diferencia de
   * `editar-contrato`, donde cada banda tiene su propio rango).
   */
  protected readonly vigenciaPuesto = computed<ProgramacionVigencia | null>(() => {
    const fila = this.filas()[0];
    if (!fila) return null;
    return this.vigenciasPorLinea().get(fila.documento_detalle_id) ?? null;
  });

  /** `true` si el día cae fuera de la vigencia del puesto (columna bloqueada). */
  protected diaBloqueado(clave: string): boolean {
    return !estaEnVigencia(clave, this.vigenciaPuesto());
  }

  /**
   * Bandas del grid: metadatos del contrato + celdas de día con su `FormControl` real.
   * Empareja `filas()`/`fechas()` con `contratosArray` (mismo orden). El template ata
   * `[formControl]="dia.control"` y hace `track dia.control`, de modo que al recrear
   * los controles el `@for` revincula los inputs por identidad (sin desfase).
   */
  protected readonly bandas = computed<readonly BandaVm[]>(() => {
    this.estructuraVersion();
    const filas = this.filas();
    const fechas = this.fechas();
    const vigencias = this.vigenciasPorLinea();
    const arr = this.contratosArray;
    const locale = localeDe(this.i18n.lang());
    if (arr.length !== filas.length) return [];

    return filas.map((fila, i) => {
      const dias = arr.at(i);
      const vigencia = vigencias.get(fila.documento_detalle_id) ?? null;
      return {
        key: fila.contrato_id as number,
        contratoId: fila.contrato_id as number,
        contratoNombre: fila.contrato_contacto_nombre_corto,
        identificacion: fila.contrato_contacto_numero_identificacion,
        rangoEtiqueta: formatVigenciaRango(vigencia, locale),
        dias: fechas.map((fecha, j) => ({
          clave: fecha.clave,
          etiqueta: fecha.etiqueta,
          inicial: fecha.inicial,
          control: dias.at(j),
          bloqueado: !estaEnVigencia(fecha.clave, vigencia),
        })),
      };
    });
  });

  /** Columnas totales de la tabla: solo los días (sin columna de empleado). */
  protected readonly colspan = computed(() => this.fechas().length);

  /** Puesto (primera fila) para el subtítulo del header: modalidad + horario. */
  protected readonly puestoInfo = computed(() => {
    const fila = this.filas()[0];
    if (!fila) return null;
    return {
      modalidadNombre: fila.modalidad_nombre,
      horario: formatHorario(fila.hora_desde, fila.hora_hasta),
    };
  });

  /** Etiqueta del mes (de la primera fecha), para el subtítulo del header. */
  protected readonly periodoEtiqueta = computed<string | null>(() => {
    const first = this.fechas()[0];
    const date = first ? fromIsoDate(first.clave) : null;
    return date
      ? date.toLocaleDateString(localeDe(this.i18n.lang()), { month: 'long', year: 'numeric' })
      : null;
  });

  protected readonly isSubmitting = signal(false);

  /**
   * Casillas en error tras guardar, con scope de contrato: `contrato_id →
   * (fecha ISO → mensaje)`. Se alimentan de los `errores` del 400 de cada línea y
   * resaltan la celda con su tooltip hasta que el usuario corrige.
   */
  protected readonly celdasError = signal<ReadonlyMap<number, ReadonlyMap<string, string>>>(
    new Map(),
  );

  /** Mensaje de error de la casilla (contrato + día), o `null` si no tiene. */
  protected errorCelda(contratoId: number, clave: string): string | null {
    return this.celdasError().get(contratoId)?.get(clave) ?? null;
  }

  /**
   * Avisos a nivel de **contrato** tras guardar: `contrato_id → mensajes[]`. Se
   * alimentan de los errores del 400 sin `fecha` (ej. horas excedidas) y se muestran
   * bajo la banda del contrato hasta que el usuario corrige.
   */
  protected readonly avisosContrato = signal<ReadonlyMap<number, readonly string[]>>(new Map());

  /**
   * Avisos de validación del batch no atribuibles a un contrato (masivo con
   * `{ errores }` de nivel superior). Se muestran en un banner arriba del modal.
   */
  protected readonly avisosGlobales = signal<readonly string[]>([]);

  /** Mensajes de nivel contrato (sin fecha) de un `contrato_id`; `[]` si no hay. */
  protected avisosDe(contratoId: number): readonly string[] {
    return this.avisosContrato().get(contratoId) ?? [];
  }

  /**
   * Solo se puede guardar con líneas cargadas y sin envío en curso. Sin regla de
   * conflicto: varios contratos pueden coincidir en día/puesto (lo valida el backend).
   */
  protected readonly puedeGuardar = computed(() => this.filas().length > 0 && !this.isSubmitting());

  constructor() {
    // Reconstruye el form (un FormArray de días por contrato) cuando cambian las filas
    // del puesto o las fechas del mes. Pre-llena cada día con su turno actual.
    // `emitEvent: false` para no disparar el valueChanges que limpia los errores.
    effect(() => {
      const filas = this.filas();
      const fechas = this.fechas();
      const arr = this.contratosArray;
      arr.clear({ emitEvent: false });
      // Vigencia por línea: los días fuera del rango nacen deshabilitados (input
      // bloqueado). `untracked` para que la llegada async del GET NO reconstruya el
      // form (pisaría lo tecleado): eso lo aplica el effect de bloqueo de abajo.
      const vigencias = untracked(() => this.vigenciasPorLinea());
      for (const fila of filas) {
        const vigencia = vigencias.get(fila.documento_detalle_id) ?? null;
        const dias = this.fb.array<FormControl<string>>([]);
        for (const fecha of fechas) {
          const control = this.fb.control(fila.dias[fecha.clave]?.turno_codigo ?? '');
          if (!estaEnVigencia(fecha.clave, vigencia)) control.disable({ emitEvent: false });
          dias.push(control, { emitEvent: false });
        }
        arr.push(dias, { emitEvent: false });
      }
      // Nuevo puesto/mes: limpia los errores (celda, contrato y globales) de un guardado anterior.
      this.celdasError.set(new Map());
      this.avisosContrato.set(new Map());
      this.avisosGlobales.set([]);
      // El pre-llenado usa `emitEvent: false`, así que `valueChanges` NO dispara: se
      // bumpea a mano `estructuraVersion` para que `bandas` recompute con los controles
      // frescos y el template revincule los inputs por identidad.
      this.estructuraVersion.update((v) => v + 1);
    });

    // Al abrir (o cambiar las líneas en edición): carga la vigencia de la línea del
    // puesto — misma lógica de negocio que `agregar-contrato` (el detalle del grid
    // no trae las fechas; todas las filas comparten la línea, el store deduplica).
    effect(() => {
      if (!this.visible()) return;
      const ids = this.filas().map((fila) => fila.documento_detalle_id);
      this.vigenciasStore.cargar(ids, () => {
        const ts = this.t().common.toasts.loadError;
        this.toast.error(ts.title, ts.desc);
      });
    });

    // La vigencia llega async (GET por línea, después de construir el form): al
    // resolver se aplica el bloqueo sobre los controles EXISTENTES — sin reconstruir,
    // para no pisar lo tecleado.
    effect(() => {
      const vigencias = this.vigenciasPorLinea();
      const filas = untracked(() => this.filas());
      const fechas = untracked(() => this.fechas());
      const arr = this.contratosArray;
      if (arr.length !== filas.length) return;
      filas.forEach((fila, i) => {
        const vigencia = vigencias.get(fila.documento_detalle_id) ?? null;
        fechas.forEach((fecha, j) => {
          const control = arr.at(i).at(j);
          const bloqueado = !estaEnVigencia(fecha.clave, vigencia);
          if (bloqueado && control.enabled) control.disable({ emitEvent: false });
          if (!bloqueado && control.disabled) control.enable({ emitEvent: false });
        });
      });
    });

    // Al tocar cualquier casilla: retira los errores del backend (celda, contrato y globales).
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.celdasError().size) this.celdasError.set(new Map());
      if (this.avisosContrato().size) this.avisosContrato.set(new Map());
      if (this.avisosGlobales().length) this.avisosGlobales.set([]);
    });
  }

  /**
   * Guarda la programación editada. Arma un payload por fila (contrato) y dispara una
   * única llamada `actualizar-masivo`. Al éxito cierra y avisa al padre;
   * al error mantiene el modal abierto, resalta las celdas del 400 y muestra un toast.
   */
  protected onGuardar(): void {
    const filas = this.filas();
    if (filas.length === 0 || this.isSubmitting()) return;

    const fechas = this.fechas();
    const payloads = filas.map(
      (fila, i): ActualizarProgramacionPayload => ({
        contrato_id: fila.contrato_id as number,
        documento_detalle_id: fila.documento_detalle_id,
        items: fechas.map((fecha, j) => ({
          fecha: fecha.clave,
          turno_codigo: this.contratosArray.at(i).at(j).value.trim() || null,
        })),
      }),
    );

    this.isSubmitting.set(true);
    this.service
      .actualizarProgramacionMasivo({ programaciones: payloads })
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
    const ts = this.t().entities.programacion.detail.programacionPuestoModal.toasts;
    this.toast.success(ts.success.title, ts.success.desc);
    this.applied.emit();
    this.visible.set(false);
  }

  /**
   * Deja el modal abierto, aplica los errores del 400 y muestra un toast. Separa por
   * alcance keyed por `contrato_id`: celdas (con `fecha`) y avisos de contrato (sin
   * `fecha`). El 400 masivo trae `{ resultados: [{ indice, errores }] }` con el `indice`
   * mapeado a `payloads[indice]`; el fallback `{ errores }` (sin `indice`) va a globales.
   */
  private onGuardadoError(err: unknown, payloads: readonly ActualizarProgramacionPayload[]): void {
    const ts = this.t().entities.programacion.detail.programacionPuestoModal.toasts;
    const { celdas, avisos, globales } = this.parseErroresMasivo(err, payloads);
    this.celdasError.set(celdas);
    this.avisosContrato.set(avisos);
    this.avisosGlobales.set(globales);
    // Si el 400 no trajo celdas/avisos pero sí un `detail`, se muestra ese mensaje.
    const huboDetalle = celdas.size > 0 || avisos.size > 0 || globales.length > 0;
    const desc = huboDetalle ? ts.error.desc : (extraerDetalleProgramacion(err) ?? ts.error.desc);
    this.toast.error(ts.error.title, desc);
  }

  /**
   * 400 de `actualizar-masivo`. Dos formas posibles:
   *  - `{ resultados: [{ indice, errores }] }` → celdas/avisos por línea, resolviendo el
   *    `contrato_id` desde `payloads[indice]`.
   *  - `{ detail, errores: [] }` → validación global del batch (sin `indice`): no
   *    atribuible a un contrato → van a `globales` (banner arriba).
   */
  private parseErroresMasivo(
    err: unknown,
    payloads: readonly ActualizarProgramacionPayload[],
  ): ErroresPorContrato {
    const acc = nuevoErroresPorContrato();
    const masivo = extraerErroresMasivo(err);
    if (masivo) {
      for (const linea of masivo.resultados) {
        const payload = payloads[linea.indice];
        if (!payload || !Array.isArray(linea.errores)) continue;
        this.acumularErrores(acc, payload.contrato_id, linea.errores);
      }
      return acc;
    }
    const global = extraerErroresProgramacion(err);
    if (global) for (const e of global.errores) acc.globales.push(e.mensaje);
    return acc;
  }

  /**
   * Reparte los `errores` de una línea en el acumulador: con `fecha` → celda
   * (`contrato_id → fecha → mensaje`); sin `fecha` → aviso de contrato.
   */
  private acumularErrores(
    acc: ErroresPorContrato,
    contratoId: number,
    errores: readonly ProgramacionErrorItem[],
  ): void {
    const { celdas, avisos } = separarErroresProgramacion(errores);
    if (celdas.size) acc.celdas.set(contratoId, celdas);
    if (avisos.length) acc.avisos.set(contratoId, avisos);
  }

  protected onClose(): void {
    this.visible.set(false);
  }
}
