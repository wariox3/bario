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
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  type FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Observable, finalize, forkJoin } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { type ErpSelectOption, I18nService, ToastService, toIsoDate } from '@reddoc/core';
import type { AppDict } from '@turnos/i18n';
import { ContratoAutocompleteComponent, type ContratoOption } from '@reddoc/ui';
import { ErpApiAutocompleteComponent } from '@reddoc/ui';
import type { ProgramacionGrupoRef } from '../programacion-grid/programacion-grid.component';
import { ProgramacionPeriodoStore } from '../programacion-agregar-contrato-modal/programacion-periodo.store';
import { PrototipoService } from '../../prototipo.service';
import type { Prototipo, PrototipoPayload } from '../../prototipo.model';

/** Fila de la tabla de **vista previa** (simulación) — año/mes/código/empleado + días. */
interface SimulacionFila {
  readonly anio: number;
  readonly mes: number;
  readonly codigo: string;
  readonly empleado: string;
  /** Código de turno por número de día del mes (`dia → codigo`). */
  readonly dias: Record<number, string>;
}

/** Grupo de formulario de una fila de la tabla de prototipo. */
type FilaGroup = FormGroup<{
  /** `null` = fila nueva (POST); con valor = fila existente (PUT/DELETE). */
  id: FormControl<number | null>;
  /** Checkbox de selección para el borrado (transitorio, no viaja en el payload). */
  sel: FormControl<boolean>;
  contrato: FormControl<ContratoOption | null>;
  secuencia: FormControl<ErpSelectOption | null>;
  fechaInicio: FormControl<string>;
  posicion: FormControl<number>;
}>;

/**
 * Modal de **prototipo** de turnos de un puesto.
 *
 * Se abre desde el botón de cada banda de grupo del grid (un puesto =
 * `documento_detalle_id`). Es la base para simular y generar automáticamente los
 * turnos de los contratos del puesto contra `/turno/prototipo`.
 *
 * Tabla editable: al abrir hace `GET` de las filas guardadas; “Nuevo” agrega una
 * fila con contrato por autocomplete; “Guardar” persiste (POST las nuevas, PUT
 * las editadas) y “Eliminar” borra por checkboxes (DELETE las guardadas). La
 * `fecha` del período es común y se deriva de la línea del documento (igual que
 * el modal de agregar contrato). La UI/UX definitiva se pulirá con la skill de
 * interface-design.
 */
@Component({
  selector: 'app-programacion-prototipo-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    ConfirmDialogModule,
    InputTextModule,
    ContratoAutocompleteComponent,
    ErpApiAutocompleteComponent,
  ],
  templateUrl: './programacion-prototipo-modal.component.html',
  styleUrl: './programacion-prototipo-modal.component.scss',
  providers: [ProgramacionPeriodoStore, ConfirmationService],
})
export class ProgramacionPrototipoModalComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(PrototipoService);
  private readonly periodoStore = inject(ProgramacionPeriodoStore);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Visibilidad del modal (two-way con el padre). */
  readonly visible = model<boolean>(false);

  /** Puesto sobre el que se trabaja (emitido por el grid). */
  readonly grupo = input<ProgramacionGrupoRef | null>(null);

  /** Número del documento de programación (CÓDIGO del encabezado). */
  readonly documentoNumero = input<string | null>(null);

  /** Nombre del cliente/contacto del documento (CLIENTE del encabezado). */
  readonly clienteNombre = input<string | null>(null);

  /** Se emite tras una operación con éxito por si el padre quiere refrescar. */
  readonly applied = output<void>();

  /** Período (mes/año) derivado de la línea del documento — alimenta `fecha`. */
  protected readonly periodo = this.periodoStore.periodo;
  protected readonly cargandoPeriodo = this.periodoStore.cargando;

  /** Días del período (1..N con inicial del día de semana) — columnas de la vista previa. */
  protected readonly dias = this.periodoStore.dias;
  /** Días festivos del mes (para resaltar columnas de la vista previa). */
  protected readonly festivoPorDia = this.periodoStore.festivoPorDia;

  /** Endpoint `seleccionar` de secuencias para el `<lib-api-autocomplete>`. */
  protected readonly secuenciaEndpoint = '/turno/secuencia/seleccionar/';

  /** Filas de la tabla. */
  protected readonly filas = this.fb.array<FilaGroup>([]);
  protected readonly form = this.fb.group({ filas: this.filas });

  /** Snapshot (id → firma) de las filas guardadas, para no hacer PUT si no cambió. */
  private readonly snapshot = new Map<number, string>();

  protected readonly cargandoLista = signal(false);
  protected readonly isSubmitting = signal(false);

  /**
   * `estructuraVersion` se incrementa al mutar el `FormArray` (agregar/quitar
   * filas) para que los `computed` de selección recomputen contra los controles
   * frescos (los cambios de estructura del array no emiten señal por sí solos).
   */
  private readonly estructuraVersion = signal(0);

  /** Cantidad de filas seleccionadas (checkbox marcado). */
  protected readonly seleccionadasCount = computed(() => {
    this.estructuraVersion();
    return this.filas.controls.filter((g) => g.controls.sel.value).length;
  });

  /** `true` si todas las filas están seleccionadas (para el checkbox del header). */
  protected readonly todasSeleccionadas = computed(() => {
    this.estructuraVersion();
    const total = this.filas.length;
    return total > 0 && this.seleccionadasCount() === total;
  });

  /** Cambios del form como señal, para recomputar `hayCambiosSinGuardar` al editar celdas. */
  private readonly formVersion = toSignal(this.form.valueChanges, { initialValue: null });

  /**
   * `true` si el borrador tiene cambios que **no** están persistidos: filas
   * nuevas (id `null`) o filas existentes cuya firma difiere del `snapshot`.
   * Es la misma noción que decide los POST/PUT en `onGuardar`; alimenta el
   * indicador "sin guardar" y la guardia al cerrar. Reacciona tanto a ediciones
   * de celda (`formVersion`) como a agregar/quitar filas (`estructuraVersion`).
   */
  protected readonly hayCambiosSinGuardar = computed<boolean>(() => {
    this.formVersion();
    this.estructuraVersion();
    return this.filas.controls.some((g) => {
      const id = g.controls.id.value;
      if (id === null) return true;
      const firmaActual = this.firma(
        g.controls.fechaInicio.value,
        g.controls.secuencia.value?.id ?? 0,
        g.controls.contrato.value?.id ?? 0,
        g.controls.posicion.value,
      );
      return this.snapshot.get(id) !== firmaActual;
    });
  });

  /**
   * Filas de la **vista previa** (cómo quedaría la programación simulada).
   *
   * Vacío hasta que `onSimular()` reciba el resultado real del backend
   * (`/turno/prototipo/simular/`). TODO(prototipo): poblarlo con la respuesta
   * una vez confirmada su forma (año/mes/código/empleado + turno por día).
   */
  protected readonly simulacion = signal<readonly SimulacionFila[]>([]);

  constructor() {
    // Al abrir (puede ser para otro puesto): tabla y período recargados.
    effect(() => {
      if (!this.visible()) return;
      this.reset();
      const grupo = this.grupo();
      if (!grupo) return;
      // El período (mes/año) se deriva de la línea real de programación.
      this.periodoStore.cargarDesdeLinea(grupo.documentoDetalleId, () => {
        const ts = this.t().common.toasts.loadError;
        this.toast.error(ts.title, ts.desc);
      });
      // Las filas del prototipo se listan por el detalle afectado (su FK). Si el
      // puesto no tiene documento afectado no hay nada guardado que listar.
      if (grupo.documentoDetalleAfectadoId !== null) {
        this.cargarLista(grupo.documentoDetalleAfectadoId);
      }
    });
  }

  // ── Carga ───────────────────────────────────────────────────────────────────

  private reset(): void {
    this.filas.clear();
    this.snapshot.clear();
    this.simulacion.set([]);
    this.periodoStore.reset();
    this.bump();
  }

  private cargarLista(documentoDetalleAfectadoId: number): void {
    this.cargandoLista.set(true);
    this.service
      .list(documentoDetalleAfectadoId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.cargandoLista.set(false)),
      )
      .subscribe({
        next: (rows) => this.poblar(rows),
        error: () => {
          const ts = this.t().common.toasts.loadError;
          this.toast.error(ts.title, ts.desc);
        },
      });
  }

  private poblar(rows: readonly Prototipo[]): void {
    this.filas.clear();
    this.snapshot.clear();
    for (const r of rows) {
      this.filas.push(this.filaDesde(r));
      this.snapshot.set(r.id, this.firma(r.fecha_inicio, r.secuencia, r.contrato, r.posicion));
    }
    this.bump();
  }

  // ── Fábrica de filas ─────────────────────────────────────────────────────────

  /** Fila existente (desde el GET): contrato bloqueado (no se cambia el contrato). */
  private filaDesde(r: Prototipo): FilaGroup {
    const contrato: ContratoOption = {
      id: r.contrato,
      nombre: r.contrato_nombre ?? `Contrato ${r.contrato}`,
      numero_identificacion: '',
    };
    const secuencia: ErpSelectOption = {
      id: r.secuencia,
      nombre: r.secuencia_nombre ?? `Secuencia ${r.secuencia}`,
    };
    const g = this.nuevaFila();
    g.controls.id.setValue(r.id);
    g.controls.contrato.setValue(contrato);
    g.controls.contrato.disable();
    g.controls.secuencia.setValue(secuencia);
    g.controls.fechaInicio.setValue(r.fecha_inicio);
    g.controls.posicion.setValue(r.posicion);
    return g;
  }

  /** Fila nueva y vacía. */
  private nuevaFila(): FilaGroup {
    return this.fb.group({
      id: this.fb.control<number | null>(null),
      sel: this.fb.control<boolean>(false),
      contrato: this.fb.control<ContratoOption | null>(null, Validators.required),
      secuencia: this.fb.control<ErpSelectOption | null>(null, Validators.required),
      fechaInicio: this.fb.control<string>('', Validators.required),
      posicion: this.fb.control<number>(1, [Validators.required, Validators.min(1)]),
    });
  }

  // ── Acciones de tabla ─────────────────────────────────────────────────────────

  protected onNuevo(): void {
    const fila = this.nuevaFila();
    const sugerida = this.fechaInicioSugerida();
    if (sugerida) fila.controls.fechaInicio.setValue(sugerida);
    this.filas.push(fila);
    this.bump();
  }

  /**
   * Fecha de inicio sugerida para una fila nueva: el primer día del período
   * (mes/año) que se está programando — el arranque natural del ciclo, y la
   * misma `fecha` que se envía al guardar. Vacío si el período aún no cargó
   * (el usuario la completa a mano).
   */
  private fechaInicioSugerida(): string {
    const periodo = this.periodo();
    return periodo ? toIsoDate(new Date(periodo.anio, periodo.mes - 1, 1)) : '';
  }

  protected onToggleFila(g: FilaGroup): void {
    g.controls.sel.setValue(!g.controls.sel.value);
    this.bump();
  }

  protected onToggleTodas(): void {
    const marcar = !this.todasSeleccionadas();
    for (const g of this.filas.controls) g.controls.sel.setValue(marcar);
    this.bump();
  }

  /** Elimina las filas marcadas: DELETE las guardadas y quita todas del formulario. */
  protected onEliminarSeleccionadas(): void {
    const seleccion = this.filas.controls.filter((g) => g.controls.sel.value);
    if (seleccion.length === 0 || this.isSubmitting()) return;

    const ids = seleccion.map((g) => g.controls.id.value).filter((id): id is number => id !== null);

    if (ids.length === 0) {
      this.quitarSeleccionadas();
      return;
    }

    this.isSubmitting.set(true);
    this.service
      .remove(ids)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          for (const id of ids) this.snapshot.delete(id);
          this.quitarSeleccionadas();
          const ts = this.t().entities.programacion.detail.prototipoModal.toasts.deleteSuccess;
          this.toast.success(ts.title, ts.desc);
          this.applied.emit();
        },
        error: () => {
          const ts = this.t().entities.programacion.detail.prototipoModal.toasts.deleteError;
          this.toast.error(ts.title, ts.desc);
        },
      });
  }

  private quitarSeleccionadas(): void {
    for (let i = this.filas.length - 1; i >= 0; i--) {
      if (this.filas.at(i).controls.sel.value) this.filas.removeAt(i);
    }
    this.bump();
  }

  /** Persiste: POST las filas nuevas + PUT las existentes que cambiaron. */
  protected onGuardar(): void {
    const grupo = this.grupo();
    const periodo = this.periodo();
    if (!grupo || !periodo || this.isSubmitting()) return;

    if (this.filas.length === 0) return;

    const m = this.t().entities.programacion.detail.prototipoModal;

    // El prototipo se persiste contra el detalle afectado (su FK). Sin él no se
    // puede guardar: se avisa y se corta antes de armar los POST/PUT.
    const documentoDetalleAfectadoId = grupo.documentoDetalleAfectadoId;
    if (documentoDetalleAfectadoId === null) {
      this.toast.error(m.toasts.saveError.title, m.sinAfectado);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error(m.toasts.saveError.title, m.validacion);
      return;
    }

    const fecha = toIsoDate(new Date(periodo.anio, periodo.mes - 1, 1));
    const ops: Observable<Prototipo>[] = [];

    for (const g of this.filas.controls) {
      const payload = this.payloadDe(g, documentoDetalleAfectadoId, fecha);
      const id = g.controls.id.value;
      if (id === null) {
        ops.push(this.service.create(payload));
      } else {
        const firmaActual = this.firma(
          payload.fecha_inicio,
          payload.secuencia,
          payload.contrato,
          payload.posicion,
        );
        if (this.snapshot.get(id) !== firmaActual) ops.push(this.service.update(id, payload));
      }
    }

    if (ops.length === 0) {
      this.toast.info(m.title, m.sinCambios);
      return;
    }

    this.isSubmitting.set(true);
    forkJoin(ops)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(m.toasts.saveSuccess.title, m.toasts.saveSuccess.desc);
          this.applied.emit();
          this.cargarLista(documentoDetalleAfectadoId);
        },
        error: () => this.toast.error(m.toasts.saveError.title, m.toasts.saveError.desc),
      });
  }

  private payloadDe(
    g: FilaGroup,
    documentoDetalleAfectadoId: number,
    fecha: string,
  ): PrototipoPayload {
    // `contrato` puede estar deshabilitado (fila existente): se lee del control,
    // no del `form.value`, que excluye los controles deshabilitados.
    const contrato = g.controls.contrato.value;
    const secuencia = g.controls.secuencia.value;
    return {
      fecha,
      fecha_inicio: g.controls.fechaInicio.value,
      documento_detalle: documentoDetalleAfectadoId,
      secuencia: secuencia?.id ?? 0,
      contrato: contrato?.id ?? 0,
      posicion: g.controls.posicion.value,
    };
  }

  private firma(
    fechaInicio: string,
    secuencia: number,
    contrato: number,
    posicion: number,
  ): string {
    return JSON.stringify([fechaInicio, secuencia, contrato, posicion]);
  }

  /** Fuerza el recálculo de los `computed` de selección tras mutar el FormArray. */
  private bump(): void {
    this.estructuraVersion.update((v) => v + 1);
  }

  /**
   * Simular: previsualiza (dry-run) los turnos que generaría el prototipo del
   * puesto, sin persistirlos (`POST /turno/prototipo/simular/`).
   *
   * TODO(prototipo): por ahora solo dispara la simulación y loguea la respuesta
   * cruda para conocer su forma; falta pintar la vista previa (año/mes/empleado
   * × días) a partir de `simulacion()` con el resultado real.
   */
  protected onSimular(): void {
    const grupo = this.grupo();
    if (!grupo || this.isSubmitting()) return;

    // Igual que el guardado, la simulación corre contra el detalle afectado.
    const documentoDetalleAfectadoId = grupo.documentoDetalleAfectadoId;
    if (documentoDetalleAfectadoId === null) {
      const m = this.t().entities.programacion.detail.prototipoModal;
      this.toast.error(m.toasts.saveError.title, m.sinAfectado);
      return;
    }

    this.isSubmitting.set(true);
    this.service
      .simular(documentoDetalleAfectadoId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: (res) => console.log('[prototipo] simular →', res),
        error: (err) => console.error('[prototipo] simular error →', err),
      });
  }

  /**
   * Generar: materializa el prototipo en la programación real del puesto
   * (crea los turnos definitivos a partir de las secuencias).
   *
   * TODO: conectar con backend. Falta definir el endpoint (p. ej.
   * `POST /turno/prototipo/generar/` con `{ documento_detalle }`), y al éxito
   * emitir `applied` para que el padre recargue el grid de programación.
   * Por ahora el botón solo queda ubicado.
   */
  protected onGenerar(): void {
    // TODO(prototipo): invocar la generación y, al éxito, this.applied.emit().
  }

  /**
   * Intercepta el `visibleChange` del diálogo: cualquier vía de cierre (botón
   * "Cerrar", ícono X, ESC) pasa por acá. Si hay cambios sin guardar pide
   * confirmación antes de descartar; si no, cierra directo. Reabrir es no-op:
   * el estado abierto lo controla el padre.
   */
  protected onVisibleChange(next: boolean): void {
    if (next) return;
    this.intentarCerrar();
  }

  protected onClose(): void {
    this.intentarCerrar();
  }

  /** Cierra el modal, confirmando el descarte si el borrador tiene cambios sin guardar. */
  private intentarCerrar(): void {
    if (!this.hayCambiosSinGuardar()) {
      this.visible.set(false);
      return;
    }
    const d = this.t().entities.programacion.detail.prototipoModal.descartar;
    this.confirmation.confirm({
      header: d.header,
      message: d.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: d.aceptar,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.visible.set(false),
    });
  }
}
