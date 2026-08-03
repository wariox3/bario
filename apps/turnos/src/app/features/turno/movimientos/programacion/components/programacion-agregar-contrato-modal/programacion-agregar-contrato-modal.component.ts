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
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import {
  type ErpSelectOption,
  I18nService,
  ToastService,
  esColumnaFestiva,
  esColumnaSabado,
  toIsoDate,
} from '@reddoc/core';
import type { AppDict } from '@turnos/i18n';
import { ContratoAutocompleteComponent, type ContratoOption } from '@reddoc/ui';
import { ErpApiAutocompleteComponent } from '@reddoc/ui';
import { UppercaseDirective } from '@reddoc/ui';
import type { SecuenciaMesCalculado } from '@turnos/features/turno/masters/secuencia/secuencia.service';
import type { ProgramacionGrupoRef } from '../programacion-grid/programacion-grid.component';
import { ProgramacionService } from '../../programacion.service';
import type { CrearProgramacionPayload } from '../../programacion.model';
import { estaEnVigencia, formatVigenciaRango, localeDe } from '../../programacion.utils';
import {
  extraerDetalleProgramacion,
  extraerErroresProgramacion,
  separarErroresProgramacion,
} from '../../programacion-errores.util';
import { ProgramacionPeriodoStore } from './programacion-periodo.store';
import { ProgramacionSecuenciaPickerComponent } from './programacion-secuencia-picker.component';

/**
 * Modal para **aplicar la programación de un contrato a un puesto**.
 *
 * Se abre desde el botón de cada banda de grupo del grid (un puesto =
 * `documento_detalle_id`). El período (mes) a programar lo deriva de la línea del
 * documento (ver `ProgramacionPeriodoStore`); permite elegir un contrato y poner
 * el código de turno de cada día, y envía `POST .../crear`. Al éxito
 * emite `applied` para que el padre refresque el grid.
 */
@Component({
  selector: 'app-programacion-agregar-contrato-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    ContratoAutocompleteComponent,
    ErpApiAutocompleteComponent,
    ProgramacionSecuenciaPickerComponent,
    UppercaseDirective,
  ],
  templateUrl: './programacion-agregar-contrato-modal.component.html',
  styleUrl: './programacion-agregar-contrato-modal.component.scss',
  providers: [ProgramacionPeriodoStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgramacionAgregarContratoModalComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly service = inject(ProgramacionService);
  private readonly periodoStore = inject(ProgramacionPeriodoStore);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Reglas de resaltado de columna (festivo/sábado), compartidas — ver utils. */
  protected readonly esColumnaFestiva = esColumnaFestiva;
  protected readonly esColumnaSabado = esColumnaSabado;

  /** Visibilidad del modal (two-way con el padre). */
  readonly visible = model<boolean>(false);

  /** Puesto sobre el que se aplica (emitido por el grid). */
  readonly grupo = input<ProgramacionGrupoRef | null>(null);

  /** Se emite tras aplicar con éxito; el padre recarga el detalle/grid. */
  readonly applied = output<void>();

  /**
   * Período/días/festivos viven en el store (deriva el mes de la línea del
   * documento). Se re-exponen como alias para que el template los consuma sin
   * conocer el store.
   */
  protected readonly periodo = this.periodoStore.periodo;
  protected readonly cargandoPeriodo = this.periodoStore.cargando;
  protected readonly dias = this.periodoStore.dias;
  protected readonly festivoPorDia = this.periodoStore.festivoPorDia;

  /**
   * Vigencia de la línea (rango ISO `desde`..`hasta`): los únicos días programables
   * del mes. Fuera de este rango el input del día se **bloquea** (control deshabilitado)
   * y la columna se atenúa. `null` = la línea no acotó rango → todos los días abiertos.
   */
  protected readonly vigencia = this.periodoStore.vigencia;

  /**
   * Números de día (1..N) dentro de la vigencia. Sin vigencia, todos los días del
   * mes quedan habilitados (degradado seguro). Comparación lexicográfica de fechas
   * ISO `YYYY-MM-DD` (ordenan igual que cronológicamente).
   */
  protected readonly diasHabilitados = computed<ReadonlySet<number>>(() => {
    const dias = this.dias();
    const v = this.vigencia();
    const p = this.periodo();
    // Sin período no hay fechas que construir; sin vigencia todos quedan habilitados.
    if (!p) return new Set(dias.map((d) => d.dia));
    const set = new Set<number>();
    for (const d of dias) {
      if (estaEnVigencia(toIsoDate(new Date(p.anio, p.mes - 1, d.dia)), v)) set.add(d.dia);
    }
    return set;
  });

  /** `true` si el día cae fuera de la vigencia (input bloqueado + columna atenuada). */
  protected diaBloqueado(dia: number): boolean {
    return !this.diasHabilitados().has(dia);
  }

  /** Rango de vigencia ya formateado para el chip de la banda (`15 de jul - 31 de jul`). */
  protected readonly vigenciaEtiqueta = computed<string | null>(() =>
    formatVigenciaRango(this.vigencia(), localeDe(this.i18n.lang())),
  );

  /** Endpoint `seleccionar` de secuencias para el `<lib-api-autocomplete>`. */
  protected readonly secuenciaEndpoint = '/turno/secuencia/seleccionar/';

  /**
   * Form: contrato elegido + un input de día (texto/código de turno) por día del
   * mes. El `FormArray` de días arranca vacío y un `effect` lo reconstruye cuando
   * cambian los `dias()` del período, ya que cada mes tiene distinto número de días.
   */
  protected readonly form = this.fb.group({
    contrato: this.fb.control<ContratoOption | null>(null),
    secuencia: this.fb.control<ErpSelectOption | null>(null),
    dias: this.fb.array<FormControl<string>>([]),
  });

  protected get diasArray(): FormArray<FormControl<string>> {
    return this.form.controls.dias;
  }

  /**
   * Se incrementa dentro del `effect` que reconstruye `diasArray`, para que
   * `diasControles` recompute con los controles frescos (los effects corren tras el
   * render). Sin esto, `diasControles` leería controles viejos.
   */
  private readonly estructuraVersion = signal(0);

  /**
   * Días del mes emparejados con su `FormControl` real. El template ata
   * `[formControl]="dc.control"` con `track dc.control`, así al reconstruir el form el
   * `@for` revincula los inputs a las instancias nuevas por identidad (evita la
   * desincronización input↔control por índice al reabrir o recalcular).
   */
  protected readonly diasControles = computed(() => {
    this.estructuraVersion();
    const dias = this.dias();
    const arr = this.diasArray;
    if (arr.length !== dias.length) return [];
    return dias.map((d, i) => ({ ...d, control: arr.at(i) }));
  });

  protected readonly isSubmitting = signal(false);

  /**
   * Casillas (día → mensaje) en error tras crear/actualizar. Se alimentan del
   * `errores` del 400 (anclado por `fecha`) y resaltan la columna con su tooltip
   * hasta que el usuario corrige la casilla.
   */
  protected readonly celdasError = signal<ReadonlyMap<number, string>>(new Map());

  /** Mensaje de error de la casilla del día (tooltip), o `null` si no tiene. */
  protected errorDia(dia: number): string | null {
    return this.celdasError().get(dia) ?? null;
  }

  /**
   * Avisos de nivel puesto tras crear (errores del 400 sin `fecha`, ej. horas
   * excedidas). Se muestran en un banner rojo hasta que el usuario corrige.
   */
  protected readonly avisosPuesto = signal<readonly string[]>([]);

  /**
   * Contrato elegido como señal (el valor del form no lo es). Sin esto el
   * `computed` de habilitación no reaccionaría a la selección.
   */
  private readonly contratoValue = toSignal(this.form.controls.contrato.valueChanges, {
    initialValue: this.form.controls.contrato.value,
  });

  /** Solo se puede aplicar con período resuelto, contrato elegido y sin envío en curso. */
  protected readonly puedeAplicar = computed(
    () => this.periodo() !== null && this.contratoValue() !== null && !this.isSubmitting(),
  );

  /** Secuencia elegida como señal, para pasarla al picker de secuencia (hijo). */
  protected readonly secuenciaValue = toSignal(this.form.controls.secuencia.valueChanges, {
    initialValue: this.form.controls.secuencia.value,
  });

  constructor() {
    // Reconstruye el FormArray de días cuando cambia el período (cada mes tiene
    // distinto número de días) o la vigencia (llega async con la línea). Los días
    // fuera de la vigencia nacen **deshabilitados**: su input queda bloqueado y no
    // aporta valor al payload. `emitEvent: false` para no disparar el `valueChanges`
    // que limpia los días ocupados.
    effect(() => {
      const dias = this.dias();
      const habilitados = this.diasHabilitados();
      const arr = this.diasArray;
      arr.clear({ emitEvent: false });
      for (const d of dias) {
        const control = this.fb.control('');
        if (!habilitados.has(d.dia)) control.disable({ emitEvent: false });
        arr.push(control, { emitEvent: false });
      }
      // Gatilla `diasControles` contra los controles recién creados (los effects
      // corren tras el render, así que sin esto leería los viejos).
      this.estructuraVersion.update((v) => v + 1);
    });

    // Al abrir (puede ser para otro puesto): form limpio y período recargado
    // desde la línea del documento (deriva mes + festivos en el store).
    effect(() => {
      if (!this.visible()) return;
      this.form.reset();
      this.periodoStore.reset();
      this.celdasError.set(new Map());
      this.avisosPuesto.set([]);
      const grupo = this.grupo();
      if (grupo) {
        this.periodoStore.cargarDesdeLinea(grupo.documentoDetalleId, () => {
          const ts = this.t().common.toasts.loadError;
          this.toast.error(ts.title, ts.desc);
        });
      }
    });

    // Al tocar cualquier campo, retira el resaltado de casillas y avisos en error.
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.celdasError().size) this.celdasError.set(new Map());
      if (this.avisosPuesto().length) this.avisosPuesto.set([]);
    });
  }

  /**
   * Vuelca en los inputs de día los `turno_codigo` calculados por el picker de
   * secuencia (evento `calculado`).
   */
  protected onSecuenciaCalculada(res: SecuenciaMesCalculado): void {
    const controls = this.diasArray.controls;
    for (const d of res.dias) {
      // Los días fuera de la vigencia están bloqueados: no se rellenan aunque la
      // secuencia calcule un turno para ellos.
      const control = controls[d.dia - 1];
      if (control?.enabled) control.setValue(d.turno_codigo);
    }
  }

  /** Arma el payload y envía `POST crear`. */
  protected onAplicar(): void {
    const grupo = this.grupo();
    const periodo = this.periodo();
    const contrato = this.form.controls.contrato.value;
    if (!grupo || !periodo || !contrato || this.isSubmitting()) return;

    const payload: CrearProgramacionPayload = {
      contrato_id: contrato.id,
      documento_detalle_id: grupo.documentoDetalleId,
      items: this.diasArray.controls.map((control, i) => ({
        fecha: toIsoDate(new Date(periodo.anio, periodo.mes - 1, i + 1)),
        turno_codigo: control.value.trim() || null,
      })),
    };

    this.isSubmitting.set(true);
    this.service
      .crearProgramacion(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false)),
      )
      .subscribe({
        next: () => {
          const ts = this.t().entities.programacion.detail.programacionModal.toasts.success;
          this.toast.success(ts.title, ts.desc);
          this.applied.emit();
          this.visible.set(false);
        },
        error: (err: unknown) => {
          const ts = this.t().entities.programacion.detail.programacionModal.toasts.error;
          if (this.handleErroresProgramacion(err, ts.title)) return;
          // 400 sin `errores[]` pero con `detail` (ej. "ya existe... use actualizar"):
          // se muestra el mensaje del backend en vez del genérico.
          this.toast.error(ts.title, extraerDetalleProgramacion(err) ?? ts.desc);
        },
      });
  }

  /**
   * Maneja el 400 de crear (`{ detail, errores: [{ fecha, mensaje, … }] }`):
   * resalta las casillas de los días con error (`fecha` → día del período) y muestra en
   * un banner los avisos de puesto (errores sin `fecha`, ej. horas excedidas). Devuelve
   * `true` si el error tenía esta forma (ya manejado); `false` para el toast genérico.
   */
  private handleErroresProgramacion(err: unknown, fallbackTitle: string): boolean {
    const body = extraerErroresProgramacion(err);
    const p = this.periodo();
    if (!body || !p) return false;

    const { celdas, avisos } = separarErroresProgramacion(body.errores);
    const porDia = new Map<number, string>();
    for (const [fecha, mensaje] of celdas) {
      const [anio, mes, dia] = fecha.split('-').map(Number);
      if (anio === p.anio && mes === p.mes) porDia.set(dia, mensaje);
    }
    if (porDia.size === 0 && avisos.length === 0) return false;

    this.celdasError.set(porDia);
    this.avisosPuesto.set(avisos);
    this.toast.error(fallbackTitle, body.detail);
    return true;
  }

  protected onClose(): void {
    this.visible.set(false);
  }
}
