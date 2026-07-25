import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type Observable, defer, finalize, forkJoin, map, of, tap } from 'rxjs';
import { FormArray, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  I18nService,
  SELECT_ENDPOINTS,
  ToastService,
  formatCop,
  type ErpSelectOption,
} from '@reddoc/core';
import { ErpApiSelectComponent } from '@reddoc/ui';
import { DocumentoDetalleService } from '@erp/core/module-config';
import { ErpItemAutocompleteComponent } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import type { ItemOption } from '@erp/core/components/item-autocomplete/erp-item-autocomplete.component';
import { ItemService } from '@erp/features/general/masters/item/item.service';
import type { AppDict } from '@erp/i18n';
import {
  createInventarioDetalleGroup,
  type InventarioDetalleGroup,
} from '../../inventario-documento-detalle.form';
import {
  inventarioDetalleToFormValue,
  inventarioDetalleToPayload,
  lineTotal,
  resumenInventario,
} from '../../inventario-documento-detalle.mapper';
import type { InventarioDetalleRead } from '../../inventario-documento-detalle.model';
import type {
  InventarioDetalleFormRawValue,
  ResumenInventario,
} from '../../inventario-documento-detalle.types';
import { InventarioDocumentoResumenComponent } from '../inventario-documento-resumen/inventario-documento-resumen.component';

/**
 * Tabla de **líneas (detalles)** de un documento de inventario. Reutilizable por
 * todos los documentos que mueven stock (entrada hoy; salida y traslado cuando
 * se sumen): recibe el `FormArray` del form padre y lo edita **inline**.
 *
 * Frente a la tabla comercial: sin impuestos ni descuento, y con **almacén por
 * línea** (precargado con el de la cabecera). El precio de la línea es el
 * **costo** del ítem, que exige una lectura extra (`GET /general/item/:id/`)
 * porque el autocomplete solo trae el precio de venta.
 *
 * Persistencia (igual que las otras familias): en **alta** (`documentId == null`)
 * las líneas viven en el `FormArray` y viajan embebidas al crear el documento;
 * en **edición** transaccionan al instante contra `/documento-detalle` (botón
 * "guardar línea" por fila; baja inmediata).
 */
@Component({
  selector: 'app-inventario-documento-detalles',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputNumberModule,
    TooltipModule,
    ConfirmDialogModule,
    ErpItemAutocompleteComponent,
    ErpApiSelectComponent,
    InventarioDocumentoResumenComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './inventario-documento-detalles.component.html',
  styleUrl: './inventario-documento-detalles.component.scss',
})
export class InventarioDocumentoDetallesComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly itemService = inject(ItemService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly formatMoney = formatCop;
  protected readonly almacenEndpoint = SELECT_ENDPOINTS.almacen;

  /** FormArray de líneas, propiedad del form padre. */
  readonly detalles = input.required<FormArray<InventarioDetalleGroup>>();

  /**
   * Id del documento en edición (`null` en alta). Cuando existe, las líneas
   * transaccionan al instante contra `/documento-detalle`.
   */
  readonly documentId = input<number | null>(null);

  /**
   * Almacén de la cabecera. Precarga la bodega de cada línea nueva: lo normal es
   * que todas entren al mismo almacén y el usuario cambie solo las excepciones.
   */
  readonly almacenPorDefecto = input<ErpSelectOption | null>(null);

  /** Espejo reactivo del valor del array para la tabla y los totales. */
  protected readonly lines = signal<readonly InventarioDetalleFormRawValue[]>([]);

  /** Resumen del documento: cantidad acumulada, subtotal y total. */
  protected readonly resumen = computed<ResumenInventario>(() => resumenInventario(this.lines()));

  /** Grupo persistiéndose ahora mismo (edición); bloquea su botón. */
  protected readonly savingGroup = signal<InventarioDetalleGroup | null>(null);

  /** Guardado en lote ("Guardar líneas" / flush del padre) en curso. */
  protected readonly savingAll = signal(false);

  /** Filas ya cableadas al fetch del costo (evita doble suscripción). */
  private readonly wired = new WeakSet<InventarioDetalleGroup>();

  constructor() {
    effect((onCleanup) => {
      const array = this.detalles();
      const sync = (): void => {
        this.lines.set(array.getRawValue());
        this.wireRows(array);
      };
      sync();
      const sub = array.valueChanges.subscribe(sync);
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected addLinea(): void {
    this.detalles().push(createInventarioDetalleGroup(undefined, this.almacenPorDefecto()));
  }

  /** Pide confirmación y, al aceptar, elimina la línea (persiste en edición). */
  protected removeLinea(group: InventarioDetalleGroup): void {
    const { id } = group.getRawValue();
    this.confirmation.confirm({
      message: this.t().entities.inventarioDetalle.confirmDeleteLine,
      header: this.t().common.confirms.deleteHeader,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteLinea(group, id),
    });
  }

  /**
   * Una fila está **pendiente** (sin persistir) cuando es nueva con ítem elegido
   * o cuando una existente fue modificada. Una fila recién agregada y vacía no
   * cuenta: no hay nada que guardar ni perder.
   */
  protected isPending(group: InventarioDetalleGroup): boolean {
    // En alta no hay persistencia por línea: las líneas viajan con el documento.
    if (this.documentId() == null) return false;
    return group.controls.id.value == null ? group.controls.item.value != null : group.dirty;
  }

  /** Filas pendientes (para el conteo del toolbar y el flush del padre). */
  private pendingRows(): readonly InventarioDetalleGroup[] {
    return this.detalles().controls.filter((row) => this.isPending(row));
  }

  /** Nº de líneas sin guardar; alimenta el botón, el toolbar y el guard de salida. */
  pendingCount(): number {
    return this.pendingRows().length;
  }

  /** Filas pendientes y válidas: las que `saveAll`/el ✓ pueden persistir ya. */
  private pendingSavable(): readonly InventarioDetalleGroup[] {
    return this.pendingRows().filter((row) => row.valid);
  }

  /** `true` si alguna línea pendiente está incompleta (p. ej. sin ítem o sin almacén). */
  hasInvalidPending(): boolean {
    return this.pendingRows().some((row) => row.invalid);
  }

  /** `true` cuando procede mostrar el botón "guardar línea" (solo edición). */
  protected canSaveRow(group: InventarioDetalleGroup): boolean {
    return this.documentId() != null && group.valid && this.isPending(group);
  }

  protected isSavingRow(group: InventarioDetalleGroup): boolean {
    return this.savingGroup() === group;
  }

  /**
   * Persiste una línea (PATCH si ya tiene `id`, POST con `documento_id` si es
   * nueva) y la reconstruye desde la respuesta autoritativa del backend. Núcleo
   * compartido por el ✓ por fila y el guardado en lote; no muestra toasts (los
   * pone cada caller).
   */
  private persistRow(group: InventarioDetalleGroup): Observable<InventarioDetalleRead> {
    const docId = this.documentId() as number;
    const payload = inventarioDetalleToPayload(group.getRawValue());
    const id = group.controls.id.value;
    const op =
      id != null
        ? this.detalleService.actualizar<InventarioDetalleRead>(id, payload)
        : this.detalleService.crear<InventarioDetalleRead>(docId, payload);
    return op.pipe(
      tap((saved) => {
        const index = this.detalles().controls.indexOf(group);
        if (index >= 0)
          this.detalles().setControl(
            index,
            createInventarioDetalleGroup(inventarioDetalleToFormValue(saved)),
          );
      }),
    );
  }

  /** Guarda una sola línea (botón ✓ por fila). */
  protected saveLinea(group: InventarioDetalleGroup): void {
    if (this.documentId() == null || group.invalid || this.savingGroup() || this.savingAll())
      return;
    this.savingGroup.set(group);
    this.persistRow(group)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingGroup.set(null);
          const toast = this.t().entities.inventarioDetalle.toasts.lineSaveSuccess;
          this.toast.success(toast.title, toast.desc);
        },
        error: () => {
          this.savingGroup.set(null);
          const toast = this.t().entities.inventarioDetalle.toasts.lineSaveError;
          this.toast.error(toast.title, toast.desc);
        },
      });
  }

  /** Click del botón "Guardar líneas": avisa de incompletas y guarda las válidas. */
  protected onSaveAllClick(): void {
    if (this.hasInvalidPending()) {
      const toast = this.t().entities.inventarioDetalle.toasts.incompleteLines;
      this.toast.warn(toast.title, toast.desc);
    }
    if (this.pendingSavable().length === 0) return;
    this.saveAll().subscribe({
      next: () => {
        const toast = this.t().entities.inventarioDetalle.toasts.allSaved;
        this.toast.success(toast.title, toast.desc);
      },
      error: () => {
        const toast = this.t().entities.inventarioDetalle.toasts.lineSaveError;
        this.toast.error(toast.title, toast.desc);
      },
    });
  }

  /**
   * Guarda en lote todas las líneas pendientes y válidas. Lo usa el botón del
   * toolbar y el form padre al guardar el documento (para no perder cambios).
   * Devuelve un Observable que completa al persistir todas y emite error si
   * alguna falla. No existe update masivo en la API, así que persiste fila por
   * fila (altas y ediciones mezcladas) en paralelo.
   *
   * Operación pura: no muestra toasts (el feedback es decisión de cada caller).
   */
  saveAll(): Observable<void> {
    // `defer`: el flag de carga y las peticiones se atan al `subscribe`, no a la
    // llamada. Así `savingAll` nunca queda colgado si alguien arma el observable
    // sin suscribirse, y las filas se evalúan en el momento de ejecutar.
    return defer(() => {
      const rows = this.pendingSavable();
      if (this.documentId() == null || rows.length === 0) return of(undefined);

      this.savingAll.set(true);
      return forkJoin(rows.map((row) => this.persistRow(row))).pipe(
        map(() => undefined),
        finalize(() => this.savingAll.set(false)),
      );
    }).pipe(takeUntilDestroyed(this.destroyRef));
  }

  /** Valorización de la fila (`cantidad × precio`), derivada del espejo `lines`. */
  protected totalOf(index: number): number {
    const line = this.lines()[index];
    return line ? lineTotal(line) : 0;
  }

  /**
   * Cablea cada fila nueva: al (re)elegir ítem, autollena el precio con su
   * **costo**. El autocomplete solo trae el precio de venta, así que el costo se
   * lee del ítem completo (`GET /general/item/:id/`).
   */
  private wireRows(array: FormArray<InventarioDetalleGroup>): void {
    for (const group of array.controls) {
      if (this.wired.has(group)) continue;
      this.wired.add(group);
      group.controls.item.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((opt) => this.loadItemCosto(group, opt));
    }
  }

  /** Trae el costo del ítem elegido y lo deja como precio de la línea. */
  private loadItemCosto(group: InventarioDetalleGroup, opt: ItemOption | null): void {
    if (!opt) return;
    this.itemService
      .getById(opt.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((item) => group.controls.precio.setValue(item.costo ?? 0));
  }

  /** Ejecuta la baja: local en alta/línea no persistida; contra la API en edición. */
  private deleteLinea(group: InventarioDetalleGroup, id: number | null): void {
    if (this.documentId() == null || id == null) {
      this.removeGroup(group);
      return;
    }
    this.detalleService
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
  private removeGroup(group: InventarioDetalleGroup): void {
    const i = this.detalles().controls.indexOf(group);
    if (i >= 0) this.detalles().removeAt(i);
  }
}
