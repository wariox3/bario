import { Component, DestroyRef, effect, inject, input, model, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';
import {
  FormErrorService,
  I18nService,
  ToastService,
  type ErpSelectOption,
  type ModelGrants,
} from '@reddoc/core';
import { ErpApiSelectComponent, FieldErrorComponent } from '@reddoc/ui';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import type { AppDict } from '@erp/i18n';
import type { Concepto } from '../../../concepto/concepto.model';
import { ConceptoCuentaService } from '../../../concepto-cuenta/concepto-cuenta.service';
import {
  toConceptoCuentaRow,
  type ConceptoCuentaRow,
} from '../../../concepto-cuenta/concepto-cuenta.mapper';
import { TIPO_COSTO_ENDPOINT } from '../../../concepto-cuenta/concepto-cuenta.constants';

/**
 * Modal con las cuentas contables de un concepto por tipo de costo.
 *
 * Arriba, la fila para agregar (tipo de costo + cuenta); debajo, las cuentas
 * guardadas. La cuenta de cada fila es un selector siempre visible: elegir otra
 * la guarda al instante (PATCH), sin botón de confirmar. La papelera pide
 * confirmación. No hay un Guardar general.
 *
 * Un concepto lleva a lo sumo una cuenta por tipo de costo: repetir uno se
 * frena en el form antes de llegar al backend.
 *
 * Los permisos sobre `HumConceptoCuenta` los trae la tabla que lo abre (los
 * necesita para mostrar el botón) y llegan por `grants`.
 */
@Component({
  selector: 'app-concepto-cuentas-dialog',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    ConfirmDialogModule,
    ErpApiSelectComponent,
    ErpCuentaSelectComponent,
    FieldErrorComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './concepto-cuentas-dialog.component.html',
  styles: ':host { display: contents; }',
})
export class ConceptoCuentasDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(ConceptoCuentaService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly tipoCostoEndpoint = TIPO_COSTO_ENDPOINT;

  readonly visible = model<boolean>(false);
  readonly concepto = input<Concepto | null>(null);
  readonly grants = input.required<ModelGrants>();
  protected readonly rows = signal<readonly ConceptoCuentaRow[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly loadFailed = signal(false);
  protected readonly isAdding = signal(false);
  /** Fila con una petición en vuelo (guardar o eliminar). */
  protected readonly busyId = signal<number | null>(null);

  protected readonly addForm = this.fb.group({
    tipo_costo: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    cuenta: this.fb.control<ErpSelectOption | null>(null, Validators.required),
  });

  constructor() {
    // Cada apertura parte limpia y trae las cuentas del concepto elegido.
    effect(() => {
      const concepto = this.concepto();
      if (!this.visible() || !concepto) return;
      this.addForm.reset();
      this.cargar(concepto.id);
    });
  }

  protected recargar(): void {
    const concepto = this.concepto();
    if (concepto) this.cargar(concepto.id);
  }

  private cargar(conceptoId: number): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    this.rows.set([]);

    this.service
      .listar(conceptoId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (respuesta) => this.rows.set(respuesta.map(toConceptoCuentaRow)),
        error: () => {
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.humano.conceptoCuenta.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  protected onAgregar(): void {
    const concepto = this.concepto();
    if (!concepto || this.isAdding()) return;

    const { tipo_costo, cuenta } = this.addForm.getRawValue();
    if (this.addForm.invalid || !tipo_costo || !cuenta) {
      this.addForm.markAllAsTouched();
      return;
    }
    if (this.rows().some((row) => row.tipo_costo === tipo_costo.id)) {
      this.addForm.controls.tipo_costo.setErrors({ duplicado: true });
      this.addForm.controls.tipo_costo.markAsTouched();
      return;
    }

    const toasts = this.t().configuracion.humano.conceptoCuenta.toasts;
    this.isAdding.set(true);

    this.service
      .crear({ concepto: concepto.id, tipo_costo: tipo_costo.id, cuenta: cuenta.id })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isAdding.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.addSuccess.title, toasts.addSuccess.desc);
          this.addForm.reset();
          this.cargar(concepto.id);
        },
        error: (err: unknown) => {
          this.formErrors.handle(this.addForm, err, toasts.saveError.title);
        },
      });
  }

  /**
   * Guarda al instante la cuenta elegida en la fila. El selector solo emite al
   * elegir una opción o al vaciarlo: vaciarlo no guarda nada (la cuenta es
   * obligatoria) y la fila vuelve a la guardada en la próxima carga.
   */
  protected onCambioCuenta(row: ConceptoCuentaRow, cuenta: ErpSelectOption | null): void {
    if (!cuenta || cuenta.id === row.cuenta) return;

    const toasts = this.t().configuracion.humano.conceptoCuenta.toasts;
    this.busyId.set(row.id);

    this.service
      .update(row.id, { cuenta: cuenta.id })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyId.set(null)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.saveSuccess.title, toasts.saveSuccess.desc);
          this.recargar();
        },
        error: () => {
          this.toast.error(toasts.saveError.title, toasts.saveError.desc);
          // Devuelve la fila a la cuenta que sigue guardada.
          this.recargar();
        },
      });
  }

  protected onEliminar(row: ConceptoCuentaRow): void {
    if (this.busyId() !== null) return;
    const m = this.t().configuracion.humano.conceptoCuenta;
    this.confirmation.confirm({
      key: 'concepto-cuenta',
      header: this.t().common.confirms.deleteHeader,
      message: m.confirmDelete,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.eliminar(row),
    });
  }

  private eliminar(row: ConceptoCuentaRow): void {
    const toasts = this.t().configuracion.humano.conceptoCuenta.toasts;
    this.busyId.set(row.id);

    this.service
      .eliminar(row.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busyId.set(null)),
      )
      .subscribe({
        next: () => {
          this.toast.success(toasts.deleteSuccess.title, toasts.deleteSuccess.desc);
          this.recargar();
        },
        error: () => this.toast.error(toasts.deleteError.title, toasts.deleteError.desc),
      });
  }
}
