import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { I18nService, ToastService, calcularResumen, type ResumenDocumento } from '@reddoc/core';
import { DocumentoDetalleService } from '@erp/core/module-config';
import type { AppDict } from '@erp/i18n';
import { ServicioDocumentoDetalleModalComponent } from '../servicio-documento-detalle-modal/servicio-documento-detalle-modal.component';
import { ServicioDocumentoResumenComponent } from '../servicio-documento-resumen/servicio-documento-resumen.component';
import { ServicioDocumentoLineasTableComponent } from '../servicio-documento-lineas-table/servicio-documento-lineas-table.component';
import { createDetalleGroup, type DetalleGroup } from '../../servicio-documento-detalle.form';
import { detalleToFormValue, detalleToPayload } from '../../servicio-documento.mapper';
import { toLineaCalculo } from '../../servicio-documento-detalle.utils';
import type { ServicioDocumentoDetalleRead } from '../../servicio-documento.model';
import type { DetalleFormRawValue } from '../../servicio-documento-detalle.types';
import type { ErpSelectOption } from '@reddoc/core';

/**
 * Listado de las líneas de servicio (detalles) del documento.
 *
 * La tabla es **solo lectura**: el alta y la edición ocurren en
 * `app-servicio-documento-detalle-modal`, así la tabla queda slim y el form de
 * línea tiene espacio. El padre es dueño del `FormArray`; aquí se agregan,
 * reemplazan y eliminan grupos. El subtotal por línea y el del documento se
 * derivan del valor del array.
 */
@Component({
  selector: 'app-servicio-documento-detalles',
  standalone: true,
  imports: [
    ButtonModule,
    ConfirmDialogModule,
    ServicioDocumentoDetalleModalComponent,
    ServicioDocumentoResumenComponent,
    ServicioDocumentoLineasTableComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './servicio-documento-detalles.component.html',
  styleUrl: './servicio-documento-detalles.component.scss',
})
export class ServicioDocumentoDetallesComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly detalle = inject(DocumentoDetalleService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;

  /** FormArray de líneas, propiedad del form padre. */
  readonly detalles = input.required<FormArray<DetalleGroup>>();

  /** Sector del documento (del form padre); se reenvía al modal para tarifar. */
  readonly sectorId = input<number | null>(null);

  /** Id del contacto (del form padre); filtra los puestos disponibles en el modal. */
  readonly contactoId = input<number | null>(null);

  /** Estrato del documento (del form padre); bloquea el botón si es null. */
  readonly estrato = input<number | null>(null);

  /** Salario del documento (del form padre); bloquea el botón si es null y se pre-llena en el modal. */
  readonly salario = input<number | null>(null);

  /**
   * Id del documento en edición (`null` en alta). Cuando existe, las líneas
   * transaccionan al instante contra `/documento-detalle` en lugar de vivir
   * solo en el `FormArray`.
   */
  readonly documentId = input<number | null>(null);

  /** Espejo reactivo del valor del array para la tabla y los subtotales. */
  protected readonly lines = signal<readonly DetalleFormRawValue[]>([]);

  /** Multi-puesto habilitado: cada línea nueva elige su puesto libremente. */
  protected readonly lockedPuesto = computed<ErpSelectOption | null>(() => null);

  /** Resumen financiero del documento: subtotal, desglose por impuesto y total. */
  protected readonly resumen = computed<ResumenDocumento>(() =>
    calcularResumen(this.lines().map(toLineaCalculo)),
  );

  // ── Estado del modal ────────────────────────────────────────────────────────
  protected readonly modalVisible = signal(false);
  /** Índice en edición; `null` ⇒ alta. */
  private readonly editingIndex = signal<number | null>(null);
  protected readonly modalValue = signal<DetalleFormRawValue | null>(null);
  /** `true` mientras una línea se persiste en vivo (edición); bloquea el modal. */
  protected readonly savingLine = signal(false);

  constructor() {
    effect((onCleanup) => {
      const array = this.detalles();
      this.lines.set(array.getRawValue());
      const sub = array.valueChanges.subscribe(() => this.lines.set(array.getRawValue()));
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected openCreate(): void {
    this.editingIndex.set(null);
    this.modalValue.set(null);
    this.modalVisible.set(true);
  }

  protected openEdit(index: number): void {
    this.editingIndex.set(index);
    this.modalValue.set(this.detalles().at(index).getRawValue());
    this.modalVisible.set(true);
  }

  /** Pide confirmación y, al aceptar, elimina la línea (persiste en edición). */
  protected removeLinea(index: number): void {
    const group = this.detalles().at(index);
    const { id } = group.getRawValue();
    this.confirmation.confirm({
      message: this.t().entities.servicioDocumento.form.detalles.confirmDeleteLine,
      header: this.t().common.confirms.deleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteLinea(group, id),
    });
  }

  /**
   * Ejecuta la baja. En **alta** (o línea aún no persistida) solo se quita del
   * `FormArray`. En **edición** se elimina contra `/documento-detalle` y la fila
   * se quita al éxito (toast de error si falla, conservando la línea).
   */
  private deleteLinea(group: DetalleGroup, id: number | null): void {
    if (this.documentId() == null || id == null) {
      this.removeGroup(group);
      return;
    }
    this.detalle
      .eliminar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removeGroup(group);
          this.toast.success(
            this.t().common.toasts.deleteSuccess.title,
            this.t().common.toasts.deleteSuccess.desc,
          );
        },
        error: () =>
          this.toast.error(
            this.t().common.toasts.deleteError.title,
            this.t().common.toasts.deleteError.desc,
          ),
      });
  }

  /** Quita un grupo del `FormArray` por su referencia (robusto ante reordenamientos). */
  private removeGroup(group: DetalleGroup): void {
    const i = this.detalles().controls.indexOf(group);
    if (i >= 0) this.detalles().removeAt(i);
  }

  /**
   * Aplica el guardado del modal.
   *
   * En **alta** (sin documento aún) la línea solo vive en el `FormArray`; se
   * persiste al crear el documento y el modal se cierra al instante. En
   * **edición** transacciona contra `/documento-detalle`: PATCH si ya tiene `id`,
   * POST con `documento_id` si es nueva (guardando el `id` devuelto). El
   * `FormArray` se actualiza, se notifica el éxito y el modal se cierra **solo al
   * éxito**; si falla, el modal queda abierto (no se pierde lo digitado).
   */
  protected onModalSave(value: DetalleFormRawValue): void {
    const index = this.editingIndex();
    const docId = this.documentId();

    if (docId == null) {
      if (index === null) this.detalles().push(createDetalleGroup(value));
      else this.detalles().setControl(index, createDetalleGroup(value));
      this.modalVisible.set(false);
      return;
    }

    this.savingLine.set(true);
    const payload = detalleToPayload(value);
    if (value.id != null) {
      this.detalle
        .actualizar<ServicioDocumentoDetalleRead>(value.id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (actualizado) => {
            // Reconstruye la fila desde la respuesta autoritativa del backend
            // (impuestos, horas, precio_minimo y precio ya recalculados).
            if (index !== null) {
              const group = createDetalleGroup(detalleToFormValue(actualizado, this.salario()));
              this.detalles().setControl(index, group);
            }
            this.savingLine.set(false);
            this.modalVisible.set(false);
            this.notifyLineSuccess();
          },
          error: () => {
            this.savingLine.set(false);
            this.notifyLineError();
          },
        });
    } else {
      this.detalle
        .crear<ServicioDocumentoDetalleRead>(docId, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (creado) => {
            // Igual que en PATCH: la respuesta del POST es la fuente de verdad.
            this.detalles().push(createDetalleGroup(detalleToFormValue(creado, this.salario())));
            this.savingLine.set(false);
            this.modalVisible.set(false);
            this.notifyLineSuccess();
          },
          error: () => {
            this.savingLine.set(false);
            this.notifyLineError();
          },
        });
    }
  }

  private notifyLineSuccess(): void {
    const toast = this.t().entities.servicioDocumento.form.detalles.toasts.lineSaveSuccess;
    this.toast.success(toast.title, toast.desc);
  }

  private notifyLineError(): void {
    const toast = this.t().entities.servicioDocumento.form.detalles.toasts.lineSaveError;
    this.toast.error(toast.title, toast.desc);
  }
}
