import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService, TenantService, ToastService, anioMesDeIso, fromIsoDate } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@turnos/i18n';
import { FestivoService, type Festivo } from '../../festivo.service';
import { ProgramacionService } from '../../programacion.service';
import { PROGRAMACION_LIST_PATH } from '../../programacion.constants';
import type {
  ProgramacionDetalleResponse,
  ProgramacionFecha,
  ProgramacionFila,
} from '../../programacion.model';
import { toProgramacionFecha } from '../../programacion.utils';
import {
  ProgramacionGridComponent,
  type ProgramacionContratoRef,
  type ProgramacionFilaRef,
  type ProgramacionGrupoRef,
} from '../../components/programacion-grid/programacion-grid.component';
import { ProgramacionAgregarContratoModalComponent } from '../../components/programacion-agregar-contrato-modal/programacion-agregar-contrato-modal.component';
import { ProgramacionEditarContratoModalComponent } from '../../components/programacion-editar-contrato-modal/programacion-editar-contrato-modal.component';
import { ProgramacionEditarPuestoModalComponent } from '../../components/programacion-editar-puesto-modal/programacion-editar-puesto-modal.component';
import { ProgramacionPrototipoModalComponent } from '../../components/programacion-prototipo-modal/programacion-prototipo-modal.component';

/** Cabecera legible de la programación para la ficha. */
interface CabeceraView {
  readonly numero: string | null;
  readonly fecha: Date | null;
  readonly identificacion: string | null;
  readonly contacto: string | null;
  readonly horas: number | null;
  readonly horasDiurnas: number | null;
  readonly horasNocturnas: number | null;
  readonly horasProgramadas: number | null;
  readonly horasDiurnasProgramadas: number | null;
  readonly horasNocturnasProgramadas: number | null;
}

/** Datos del grid (calendario) ya normalizados para el componente. */
interface GridView {
  readonly fechas: readonly ProgramacionFecha[];
  readonly filas: readonly ProgramacionFila[];
}

/**
 * Ficha (detalle) de una **programación** — solo lectura.
 *
 * Movimiento del módulo Turno. Llega desde el listado (`detalle/:id`). Replica
 * el shape visual de la ficha de documentos (factura de venta): encabezado con
 * volver + sección "Información general", más el grid (calendario) de turnos.
 *
 * La cabecera (`CabeceraView`) se mapea de `ProgramacionDetalleResponse.documento`
 * (número/fecha/contacto/horas) y el grid de `fechas` + `filas`.
 */
@Component({
  selector: 'app-programacion-detail',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    BreadcrumbComponent,
    ProgramacionGridComponent,
    ProgramacionAgregarContratoModalComponent,
    ProgramacionEditarContratoModalComponent,
    ProgramacionEditarPuestoModalComponent,
    ProgramacionPrototipoModalComponent,
  ],
  templateUrl: './programacion-detail.component.html',
  styleUrl: './programacion-detail.component.scss',
  providers: [ConfirmationService],
})
export class ProgramacionDetailComponent implements OnInit {
  private readonly service = inject(ProgramacionService);
  private readonly festivoService = inject(FestivoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id de la programación (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly cabecera = signal<CabeceraView | null>(null);
  protected readonly grid = signal<GridView | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Filas seleccionadas en el grid (checkboxes), para la acción de borrado masivo. */
  protected readonly seleccionadas = signal<readonly ProgramacionFilaRef[]>([]);

  /** Modal de agregar contrato al puesto (se abre desde el botón del grupo del grid). */
  protected readonly agregarContratoVisible = signal(false);
  protected readonly agregarContratoGrupo = signal<ProgramacionGrupoRef | null>(null);

  /** Modal de prototipo del puesto (se abre desde el botón del grupo del grid). */
  protected readonly prototipoVisible = signal(false);
  protected readonly prototipoGrupo = signal<ProgramacionGrupoRef | null>(null);

  /** Modal de editar la programación de un contrato (se abre desde la fila del grid). */
  protected readonly editarContratoVisible = signal(false);
  protected readonly edicionContrato = signal<ProgramacionContratoRef | null>(null);

  /** Modal de editar la programación del puesto (se abre desde el nombre del puesto en el grid). */
  protected readonly editarPuestoVisible = signal(false);
  protected readonly edicionPuesto = signal<ProgramacionGrupoRef | null>(null);

  /**
   * Filas que edita el modal de puesto: todos los contratos de ese puesto (mismo
   * `documento_detalle_id`), excluyendo vacantes sin contrato asignado (no programables).
   */
  protected readonly edicionPuestoFilas = computed<readonly ProgramacionFila[]>(() => {
    const grid = this.grid();
    const puesto = this.edicionPuesto();
    if (!grid || !puesto) return [];
    return grid.filas.filter(
      (f) => f.documento_detalle_id === puesto.documentoDetalleId && f.contrato_id !== null,
    );
  });

  /**
   * Modo del modal de edición: `'linea'` edita una sola fila (lápiz) y guarda con
   * `actualizar-programacion`; `'masivo'` edita todas las líneas del contrato
   * (click en el nombre) y guarda con `actualizar-programacion-masivo`.
   */
  protected readonly edicionModo = signal<'linea' | 'masivo'>('masivo');

  /** Línea concreta en edición cuando el modo es `'linea'`; `null` en masivo. */
  protected readonly edicionLineaRef = signal<ProgramacionFilaRef | null>(null);

  /**
   * Filas que edita el modal, filtradas del grid ya cargado. En `'linea'` es solo
   * la fila señalada (contrato + puesto); en `'masivo'`, todas las líneas del
   * contrato (una por puesto). Comparten las mismas `fechas` (mismo mes).
   */
  protected readonly edicionFilas = computed<readonly ProgramacionFila[]>(() => {
    const grid = this.grid();
    if (!grid) return [];
    if (this.edicionModo() === 'linea') {
      const ref = this.edicionLineaRef();
      if (!ref) return [];
      const fila = grid.filas.find(
        (f) =>
          f.documento_detalle_id === ref.documentoDetalleId && f.contrato_id === ref.contratoId,
      );
      return fila ? [fila] : [];
    }
    const contrato = this.edicionContrato();
    if (!contrato) return [];
    return grid.filas.filter((f) => f.contrato_id === contrato.id);
  });

  private readonly festivos = signal<readonly Festivo[]>([]);

  /** Set de fechas ISO festivas del período — para resaltar columnas en el grid. */
  protected readonly festivoClaves = computed<ReadonlySet<string>>(() => {
    const set = new Set<string>();
    for (const f of this.festivos()) set.add(f.fecha);
    return set;
  });

  /** Migas: módulo Turno → listado de programaciones → registro abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      {
        label: this.t().entities.programacion.name,
        routerLink: slug ? ['/t', slug, ...PROGRAMACION_LIST_PATH] : undefined,
      },
      { label: `ID ${this.id() ?? ''}` },
    ];
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadDetalle(id);
  }

  protected onBack(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...PROGRAMACION_LIST_PATH]);
  }

  /** Abre el modal de agregar contrato al puesto emitido por el grid. */
  protected onAgregarContrato(grupo: ProgramacionGrupoRef): void {
    this.agregarContratoGrupo.set(grupo);
    this.agregarContratoVisible.set(true);
  }

  /** Abre el modal de prototipo del puesto emitido por el grid. */
  protected onPrototipo(grupo: ProgramacionGrupoRef): void {
    this.prototipoGrupo.set(grupo);
    this.prototipoVisible.set(true);
  }

  /** Abre el modal de edición con una sola línea (fila) del contrato. */
  protected onEditarLinea(ref: ProgramacionFilaRef): void {
    const fila = this.grid()?.filas.find(
      (f) => f.documento_detalle_id === ref.documentoDetalleId && f.contrato_id === ref.contratoId,
    );
    this.edicionModo.set('linea');
    this.edicionLineaRef.set(ref);
    // El header del modal lee `edicionContrato`; se arma desde la fila señalada.
    this.edicionContrato.set(
      fila
        ? {
            id: ref.contratoId,
            nombre: fila.contrato_contacto_nombre_corto ?? '',
            numeroIdentificacion: fila.contrato_contacto_numero_identificacion ?? '',
          }
        : null,
    );
    this.editarContratoVisible.set(true);
  }

  /** Abre el modal de edición con todas las líneas (puestos) del contrato (masivo). */
  protected onEditarContrato(ref: ProgramacionContratoRef): void {
    this.edicionModo.set('masivo');
    this.edicionLineaRef.set(null);
    this.edicionContrato.set(ref);
    this.editarContratoVisible.set(true);
  }

  /** Abre el modal de edición de la programación de todos los contratos del puesto. */
  protected onEditarPuesto(ref: ProgramacionGrupoRef): void {
    this.edicionPuesto.set(ref);
    this.editarPuestoVisible.set(true);
  }

  /** Confirma y elimina la programación del contrato (fila) emitida por el grid. */
  protected onEliminarContrato(ref: ProgramacionFilaRef): void {
    const el = this.t().entities.programacion.detail.eliminar;
    this.confirmation.confirm({
      header: el.confirmHeader,
      message: el.confirmMessage.replace('{nombre}', ref.contratoNombre ?? '—'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminarProgramacion(ref),
    });
  }

  private eliminarProgramacion(ref: ProgramacionFilaRef): void {
    const el = this.t().entities.programacion.detail.eliminar;
    this.service
      .eliminarProgramacion({
        contrato_id: ref.contratoId,
        documento_detalle_id: ref.documentoDetalleId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(el.toasts.success.title, el.toasts.success.desc);
          this.onApplied();
        },
        error: () => this.toast.error(el.toasts.error.title, el.toasts.error.desc),
      });
  }

  /** Recibe la selección del grid (checkboxes) para habilitar la acción del header. */
  protected onSeleccionChange(refs: readonly ProgramacionFilaRef[]): void {
    this.seleccionadas.set(refs);
  }

  /** Confirma y elimina en masivo las líneas seleccionadas (checkboxes) del grid. */
  protected onEliminarSeleccion(refs: readonly ProgramacionFilaRef[]): void {
    if (refs.length === 0) return;
    const el = this.t().entities.programacion.detail.eliminar;
    this.confirmation.confirm({
      header: el.confirmMasivoHeader,
      message: el.confirmMasivoMessage.replace('{n}', String(refs.length)),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminarSeleccion(refs),
    });
  }

  private eliminarSeleccion(refs: readonly ProgramacionFilaRef[]): void {
    const el = this.t().entities.programacion.detail.eliminar;
    this.service
      .eliminarProgramacionMasivo({
        programaciones: refs.map((r) => ({
          contrato_id: r.contratoId,
          documento_detalle_id: r.documentoDetalleId,
        })),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(el.toasts.success.title, el.toasts.success.desc);
          this.onApplied();
        },
        error: () => this.toast.error(el.toasts.error.title, el.toasts.error.desc),
      });
  }

  /** Tras aplicar la programación, recarga el detalle y limpia la selección. */
  protected onApplied(): void {
    this.seleccionadas.set([]);
    const id = Number(this.id());
    if (Number.isFinite(id)) this.loadDetalle(id);
  }

  /** Fecha larga de la cabecera (`20 de junio de 2026`). */
  protected formatFecha(date: Date | null): string {
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  /**
   * Carga los festivos del período que muestra el grid, derivando año y mes de la
   * primera fecha ISO (`YYYY-MM-DD`). Sin esto, el mes de "hoy" no coincide con el
   * de la programación y no se resalta ningún festivo.
   */
  private cargarFestivosDelPeriodo(fechas: readonly string[]): void {
    const periodo = anioMesDeIso(fechas[0]);
    if (!periodo) {
      this.festivos.set([]);
      return;
    }
    this.cargarFestivos(periodo.anio, periodo.mes);
  }

  private cargarFestivos(anio: number, mes: number): void {
    this.festivoService
      .getDelMes(anio, mes)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.festivos.set(list),
        error: () => this.festivos.set([]),
      });
  }

  private loadDetalle(id: number): void {
    this.service
      .getDetalle(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.cargarFestivosDelPeriodo(res.fechas);
          const doc = res.documento;
          this.cabecera.set({
            numero: String(doc.numero),
            fecha: fromIsoDate(doc.fecha),
            identificacion: doc.contacto_numero_identificacion,
            contacto: doc.contacto_nombre_corto,
            horas: doc.horas,
            horasDiurnas: doc.horas_diurnas,
            horasNocturnas: doc.horas_nocturnas,
            horasProgramadas: doc.horas_programadas,
            horasDiurnasProgramadas: doc.horas_diurnas_programadas,
            horasNocturnasProgramadas: doc.horas_nocturnas_programadas,
          });
          this.grid.set(this.parseGrid(res));
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          this.toast.error(
            this.t().common.toasts.loadError.title,
            this.t().common.toasts.loadError.desc,
          );
        },
      });
  }

  private parseGrid(res: ProgramacionDetalleResponse): GridView {
    const fechas = res.fechas.map(toProgramacionFecha);
    return { fechas, filas: res.filas };
  }
}
