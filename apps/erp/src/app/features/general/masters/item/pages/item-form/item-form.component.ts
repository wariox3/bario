import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { MultiSelectModule } from 'primeng/multiselect';
import { FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
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
 * Formulario de alta/edición de item.
 *
 * Master del módulo General (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por `withComponentInputBinding`).
 */
@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [
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
      next: () => {
        this.isSaving.set(false);
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
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
   * (un servicio no maneja existencias). Al volver a producto, se rehabilita.
   */
  private applyTipo(tipo: 'producto' | 'servicio'): void {
    const esServicio = tipo === 'servicio';
    this.esServicio.set(esServicio);
    const { inventario } = this.form.controls;
    if (esServicio) {
      inventario.setValue(false, { emitEvent: false });
      inventario.disable({ emitEvent: false });
    } else {
      inventario.enable({ emitEvent: false });
    }
  }

  private loadImpuestos(): void {
    this.selectData
      .fetchOptions('/general/impuesto/seleccionar/', { venta: 'True' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => this.impuestosVentaOptions.set(options),
        error: () => this.impuestosVentaOptions.set([]),
      });
    this.selectData
      .fetchOptions('/general/impuesto/seleccionar/', { compra: 'True' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (options) => this.impuestosCompraOptions.set(options),
        error: () => this.impuestosCompraOptions.set([]),
      });
  }

  private loadItem(id: number): void {
    this.itemService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (item) => {
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
