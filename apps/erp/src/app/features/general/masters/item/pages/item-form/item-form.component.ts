import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, of } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { FieldErrorComponent, FocusInvalidDirective, PageActionsComponent } from '@reddoc/ui';
import {
  ErpSelectDataService,
  type ErpSelectOption,
  FormErrorService,
  I18nService,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpCuentaSelectComponent } from '@erp/core/components/cuenta-select/erp-cuenta-select.component';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ItemService } from '../../item.service';
import { ITEM_LIST_PATH } from '../../item.constants';
import { formValueToPayload, itemToFormValue } from '../../item.mapper';

/**
 * Opción del catálogo de impuestos etiquetada con el **nombre extendido**
 * (`"IVA 19% ventas"`), que es como se muestra el impuesto en todo el ERP. El
 * multiselect etiqueta por `nombre`, así que se normaliza al llegar.
 */
function conNombreExtendido(option: ErpSelectOption): ErpSelectOption {
  const extendido = option['nombre_extendido'];
  return typeof extendido === 'string' && extendido ? { ...option, nombre: extendido } : option;
}

/**
 * Formulario de alta/edición de item.
 *
 * Master del módulo General (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por `withComponentInputBinding`).
 *
 * También sirve como **modal** (alta inline desde la línea de un documento): si
 * hay un `DynamicDialogRef` inyectable es que lo abrió un `DialogService`, y en
 * ese modo esconde el chrome de página (breadcrumb, barra pegajosa), pinta su
 * propio encabezado/pie y al guardar **cierra devolviendo el ítem creado** en
 * vez de navegar a la lista.
 */
@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    RadioButtonModule,
    MultiSelectModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpCuentaSelectComponent,
  ],
  templateUrl: './item-form.component.html',
  styleUrl: './item-form.component.scss',
})
export class ItemFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly itemService = inject(ItemService);
  private readonly selectData = inject(ErpSelectDataService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  /** Presente solo cuando el form vive en un modal (alta inline); `null` como página. */
  private readonly dialogRef = inject(DynamicDialogRef, { optional: true });

  /** `true` cuando el form se abrió como modal desde un documento. */
  protected readonly isModal = this.dialogRef !== null;

  protected readonly t = this.i18n.t;

  /** Id del item a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly isSaving = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const moduleId = currentModuleId(this.activeModule);
    return [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, moduleId] : undefined,
      },
      {
        label: this.t().entities.item.name,
        routerLink: slug ? ['/t', slug, moduleId, ...ITEM_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  /** Opciones de impuestos por tipo (cargadas en construcción). */
  protected readonly impuestosVentaOptions = signal<ErpSelectOption[]>([]);
  protected readonly impuestosCompraOptions = signal<ErpSelectOption[]>([]);

  protected readonly form = this.fb.group({
    codigo: ['', Validators.required],
    nombre: ['', Validators.required],
    referencia: [''],
    tipo: this.fb.nonNullable.control<'producto' | 'servicio'>('producto'),
    precio: this.fb.control<number>(0),
    costo: this.fb.control<number>(0),
    inventario: [true],
    negativo: [false],
    venta: [false],
    favorito: [false],
    inactivo: [false],
    impuestos_venta: this.fb.nonNullable.control<ErpSelectOption[]>([]),
    impuestos_compra: this.fb.nonNullable.control<ErpSelectOption[]>([]),
    cuenta_venta: this.fb.control<ErpSelectOption | null>(null),
    cuenta_compra: this.fb.control<ErpSelectOption | null>(null),
    cuenta_costo_venta: this.fb.control<ErpSelectOption | null>(null),
    cuenta_inventario: this.fb.control<ErpSelectOption | null>(null),
  });

  /** Servicio no maneja existencias: ocultamos/forzamos `inventario`. */
  protected readonly esServicio = signal(false);

  /**
   * El ítem ya se movió en documentos. Bloquea su **naturaleza** —tipo y manejo
   * de inventario—, no sus datos: precio, nombre, cuentas e impuestos se siguen
   * editando. Siempre `false` en alta.
   */
  protected readonly enUso = signal(false);

  constructor() {
    this.setupFormReactions();
    this.loadImpuestos();
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadItem(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.item.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.itemService.update(Number(id), payload)
      : this.itemService.create(payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        // Como modal, el ítem creado vuelve a quien lo pidió (la línea del
        // documento lo selecciona); como página, se navega a la lista.
        if (this.dialogRef) {
          this.dialogRef.close(saved);
          return;
        }
        this.navigateToList();
      },
      error: (err: unknown) => {
        this.isSaving.set(false);
        const fail = id ? toasts.editError : toasts.createError;
        this.formErrors.handle(this.form, err, fail.title);
      },
    });
  }

  protected onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close(null);
      return;
    }
    this.navigateToList();
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  /** Conecta los `valueChanges` del control `tipo` al estado de `inventario`. */
  private setupFormReactions(): void {
    const { controls } = this.form;
    controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      this.applyTipo(tipo);
    });
    this.applyTipo(controls.tipo.value);
  }

  /**
   * Si el item es servicio, `inventario` se fuerza a `false` y se deshabilita
   * (un servicio no maneja existencias). Al volver a producto, se rehabilita —
   * salvo que el ítem esté en uso, que es un bloqueo de mayor jerarquía: sin ese
   * `if`, cargar un ítem en uso rehabilitaría el checkbox que `enUso` acaba de
   * apagar, porque `patchValue` dispara esta misma reacción.
   */
  private applyTipo(tipo: 'producto' | 'servicio'): void {
    const esServicio = tipo === 'servicio';
    this.esServicio.set(esServicio);
    const { inventario } = this.form.controls;
    if (esServicio) {
      inventario.setValue(false, { emitEvent: false });
      inventario.disable({ emitEvent: false });
    } else if (!this.enUso()) {
      inventario.enable({ emitEvent: false });
    }
  }

  /**
   * Apaga lo que un ítem ya movido no puede cambiar. Un control deshabilitado no
   * viaja en el payload, así que el bloqueo es real y no solo visual.
   */
  private aplicarBloqueoPorUso(): void {
    this.enUso.set(true);
    this.form.controls.tipo.disable({ emitEvent: false });
    this.form.controls.inventario.disable({ emitEvent: false });
  }

  private loadImpuestos(): void {
    this.selectData
      .fetchOptions('/general/impuesto/seleccionar/', { venta: 'True' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => this.impuestosVentaOptions.set(options.map(conNombreExtendido)),
        error: () => this.impuestosVentaOptions.set([]),
      });
    this.selectData
      .fetchOptions('/general/impuesto/seleccionar/', { compra: 'True' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => this.impuestosCompraOptions.set(options.map(conNombreExtendido)),
        error: () => this.impuestosCompraOptions.set([]),
      });
  }

  /**
   * Trae el ítem y su estado de uso **juntos**, para que el formulario nazca ya
   * bloqueado en vez de habilitar los campos y apagarlos un instante después.
   *
   * La consulta de uso degrada a `false` ante cualquier error: si `validar-uso/`
   * falla, el formulario abre igual en vez de dejar la pantalla sin cargar.
   * Deja de proteger, pero no rompe.
   */
  private loadItem(id: number): void {
    forkJoin({
      item: this.itemService.getById(id),
      enUso: this.itemService.validarUso(id).pipe(catchError(() => of(false))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ item, enUso }) => {
          if (enUso) this.aplicarBloqueoPorUso();
          this.form.patchValue(itemToFormValue(item));
        },
        error: () => {
          const toasts = this.t().entities.item.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, currentModuleId(this.activeModule), ...ITEM_LIST_PATH]);
  }
}
