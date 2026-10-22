import {
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin } from 'rxjs';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { TabsModule } from 'primeng/tabs';
import {
  FieldErrorComponent,
  FocusInvalidDirective,
  PageActionsComponent,
  MascaraFechaDirective,
} from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  startOfToday,
  TenantService,
  ToastService,
  resumenDesdeCabecera,
  type ResumenDocumento,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
import { ErpContactoSelectComponent } from '@reddoc/ui';
import { ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ErpSelectDataService, SELECT_ENDPOINTS } from '@reddoc/core';
import {
  DocumentoDetalleService,
  ENTITY_DATA_GATEWAY,
  extractDocumentoId,
} from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { CanComponentDeactivate } from '@erp/core/guards/unsaved-changes.guard';
import {
  canLeaveDocumentForm,
  hayCambiosSinGuardar,
  type CambiosDocumento,
} from '@erp/core/guards/leave-document-form';
import {
  guardarTablasEnSerie,
  type TablaEnVivoDocumento,
} from '@erp/features/documentos/tablas-en-vivo';
import { CambiosSinGuardarComponent } from '@erp/features/documentos/components/cambios-sin-guardar/cambios-sin-guardar.component';
import type { AppDict } from '@erp/i18n';
import { FORMA_PAGO_ENDPOINT, SEDE_ENDPOINT } from '../../factura-compra.constants';
import { setupPlazoPagoDesdeContacto } from '@erp/features/documentos/comercial/plazo-pago-contacto';
import {
  setupVencimientoAutocompute,
  type VencimientoAutocompute,
} from '@erp/features/documentos/comercial/vencimiento-autocompute';
import { VencimientoHintComponent } from '@erp/features/documentos/comercial/components/vencimiento-hint/vencimiento-hint.component';
import { ComercialDocumentoDetallesComponent } from '@erp/features/documentos/comercial/components/comercial-documento-detalles/comercial-documento-detalles.component';
import type { ComercialDetalleGroup } from '@erp/features/documentos/comercial/comercial-documento-detalle.form';
import { reemplazarFilas } from '@erp/features/documentos/form-array-filas';
import { ContableDocumentoDetallesComponent } from '@erp/features/documentos/contable/components/contable-documento-detalles/contable-documento-detalles.component';
import {
  createCuentaDetalleGroup,
  type CuentaDetalleGroup,
} from '@erp/features/documentos/contable/contable-documento-detalle.form';
import {
  cuentaDetalleToFormValue,
  resumenConCuentas,
} from '@erp/features/documentos/contable/contable-documento-detalle.mapper';
import {
  propagarCentroCostoALineas,
  propagarContactoALineas,
} from '@erp/features/documentos/contable/contable-documento-detalle.form';
import { facturaCompraToFormValue, formValueToPayload } from '../../factura-compra.mapper';
import type { FacturaCompraRead, FacturaLineaRead } from '../../factura-compra.model';
import { ComercialDocumentoResumenComponent } from '@erp/features/documentos/comercial/components/comercial-documento-resumen/comercial-documento-resumen.component';
import { MasInformacionComponent } from '@erp/features/documentos/components/mas-informacion/mas-informacion.component';
import { pestanaConPrimerError } from '@erp/features/documentos/tablas-en-vivo';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CrearTerceroDirective } from '@erp/features/general/masters/contacto/crear-tercero.directive';

/** Lo que el guard de salida necesita de cada tabla de líneas. */
interface FlushableLineTable {
  pendingCount(): number;
}

/**
 * Formulario de alta/edición de la **cabecera** de una Factura de compra.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`. El form recibe el `DocumentEntityConfig` por input
 * binding (resuelto por `activeDocumentResolver` en la ruta padre) y deriva de
 * él el `documentTypeId`, las claves i18n y la ruta de la lista. El HTTP se
 * delega en `ENTITY_DATA_GATEWAY`.
 *
 * Espeja la factura de venta (misma familia comercial), salvo que el contacto
 * es el **proveedor** y la tabla de líneas trabaja en `modo="compra"` (usa los
 * impuestos de compra del ítem). La **tabla de detalles** compartida se compone
 * vía `<app-comercial-documento-detalles>` recibiendo el `FormArray` de líneas.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */

@Component({
  selector: 'app-factura-compra-form',
  standalone: true,
  imports: [
    CambiosSinGuardarComponent,
    InputTextModule,
    TextareaModule,
    MasInformacionComponent,
    ComercialDocumentoResumenComponent,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    MascaraFechaDirective,
    TabsModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    PageActionsComponent,
    ErpContactoSelectComponent,
    CrearTerceroDirective,
    ErpApiSelectComponent,
    ComercialDocumentoDetallesComponent,
    VencimientoHintComponent,
    ContableDocumentoDetallesComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './factura-compra-form.component.html',
  styleUrl: './factura-compra-form.component.scss',
})
export class FacturaCompraFormComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly selectData = inject(ErpSelectDataService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly confirmation = inject(ConfirmationService);

  protected readonly t = this.i18n.t;

  /** Tabla de líneas de ítem: el padre le delega el flush y el conteo de pendientes. */
  private readonly detallesTable = viewChild(ComercialDocumentoDetallesComponent);

  /**
   * Alguna tabla de líneas está guardando o resolviendo ítems (AIU). "Guardar" espera:
   * un segundo lote reenviaría líneas que todavía no tienen `id`.
   */
  protected readonly tablasOcupadas = computed(
    () => (this.detallesTable()?.ocupado() ?? false) || (this.cuentasTable()?.ocupado() ?? false),
  );

  /** Tabla de líneas de cuenta contable; mismo contrato de flush que la de ítems. */
  private readonly cuentasTable = viewChild(ContableDocumentoDetallesComponent);

  /** Hay líneas de ítem o de cuenta: la página pinta el resumen solo entonces. */
  protected readonly hayLineas = computed(
    () =>
      (this.detallesTable()?.hayLineas() ?? false) || (this.cuentasTable()?.hayLineas() ?? false),
  );

  /** Débitos y créditos de las cuentas, para las filas del resumen. */
  protected readonly resumenCuentas = computed(
    () => this.cuentasTable()?.resumen() ?? { debitos: 0, creditos: 0, total: 0 },
  );

  /**
   * Resumen de la factura: subtotal, descuento e impuestos de los ítems y un
   * total al que las cuentas débito suman y las crédito restan. Es uno solo para
   * las dos pestañas: el total del documento no cambia según lo que se mire.
   *
   * Las cuentas se suman una sola vez, desde su tabla, que las tiene todas y las
   * recalcula en vivo. La base de los ítems que viene del backend ya las deja
   * afuera aunque su `total` las incluya (`resumenDesdeCabecera`).
   */
  protected readonly resumen = computed(() => {
    const items = this.detallesTable()?.resumen() ?? {
      subtotal: 0,
      descuento: 0,
      impuestos: [],
      total: 0,
    };
    return resumenConCuentas(items, this.resumenCuentas());
  });

  /** Tab activo del bloque de líneas (Detalles / Cuentas). */
  protected readonly activeTab = signal<'detalles' | 'cuentas'>('detalles');

  /**
   * Control del form → pestaña que lo contiene, en orden de pantalla. Al guardar con
   * errores se abre la del primero, para que `libFocusInvalid` pueda llevar al campo.
   */
  private readonly pestanasPorControl: Readonly<Record<string, 'detalles' | 'cuentas'>> = {
    detalles: 'detalles',
    cuentas: 'cuentas',
  };

  protected readonly plazoPagoEndpoint = SELECT_ENDPOINTS.plazoPago;
  protected readonly sedeEndpoint = SEDE_ENDPOINT;
  protected readonly almacenEndpoint = SELECT_ENDPOINTS.almacen;
  protected readonly centroCostoEndpoint = SELECT_ENDPOINTS.centroCosto;
  protected readonly formaPagoEndpoint = FORMA_PAGO_ENDPOINT;

  /** Filtra el autocomplete de contacto a proveedores. */
  protected readonly contactoParams = { proveedor: 'True' } as const;

  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Id del documento a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  /**
   * Cabecera pre-cargada por `editableDocumentResolver` (clave de ruta
   * `documentoEdit`). En edición llega ya resuelta y el form la reúsa en vez de
   * volver a pedirla; `null`/ausente en alta o si el resolver hizo fail-open.
   */
  readonly documentoEdit = input<unknown>();

  protected readonly isEditMode = computed(() => !!this.id());

  /**
   * En alta, sede, almacén y forma de pago auto-seleccionan la primera opción
   * (como el legacy): lo habitual es tener una sola. En edición manda la del
   * documento.
   */
  protected readonly primeraSugerida = computed(() => (this.isEditMode() ? null : 0));

  /** Id del documento como número (`null` en alta); alimenta la transacción por línea. */
  protected readonly documentId = computed(() => {
    const id = this.id();
    return id ? Number(id) : null;
  });
  protected readonly isSaving = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    documentoBreadcrumb(
      this.activeModule,
      this.t(),
      this.tenant.currentSlug(),
      this.i18n.translate(this.document().displayNameKey),
      this.document().id,
      this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new,
    ),
  );

  protected readonly form = this.fb.group({
    contacto: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(startOfToday(), Validators.required),
    fecha_vence: this.fb.control<Date | null>(null, Validators.required),
    plazo_pago: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    sede: this.fb.control<ErpSelectOption | null>(null),
    almacen: this.fb.control<ErpSelectOption | null>(null),
    centro_costo: this.fb.control<ErpSelectOption | null>(null),
    forma_pago: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    orden_compra: this.fb.control<string | null>(null, Validators.maxLength(50)),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    detalles: new FormArray<ComercialDetalleGroup>([]),
    cuentas: new FormArray<CuentaDetalleGroup>([]),
  });

  /**
   * Espejo en signal del contacto y el centro de costo de la cabecera, para que
   * siembre con ellos cada cuenta nueva (como el asiento). Se escriben en los dos
   * únicos puntos donde cambian —la elección del usuario y la carga en edición—;
   * esta última patchea con `emitEvent: false`, así que no basta con seguir
   * `valueChanges`.
   */
  protected readonly contactoCabecera = signal<ErpSelectOption | null>(null);
  protected readonly centroCostoCabecera = signal<ErpSelectOption | null>(null);

  /**
   * Resumen de los ítems que calculó el backend, leído de la cabecera en edición.
   * La tabla de ítems, paginada, parte de él; `null` en alta.
   */
  protected readonly resumenBase = signal<ResumenDocumento | null>(null);

  /**
   * Estado del vencimiento (días del plazo, fecha que dicta y desvío), para que
   * `<app-vencimiento-hint>` explique bajo el campo de dónde salió la fecha.
   */
  protected readonly vencimiento: VencimientoAutocompute;

  constructor() {
    // Autocálculo del vencimiento (fecha + días del plazo); el campo sigue editable.
    this.vencimiento = setupVencimientoAutocompute({
      fecha: this.form.controls.fecha,
      plazoPago: this.form.controls.plazo_pago,
      fechaVence: this.form.controls.fecha_vence,
      selectData: this.selectData,
      destroyRef: this.destroyRef,
      endpoint: this.plazoPagoEndpoint,
    });

    // Al elegir proveedor, adopta su plazo de pago pactado. Cambiar el plazo
    // dispara el autocálculo de arriba, que reajusta la fecha de vencimiento. En
    // edición no aplica: `applyCabecera` puebla con `emitEvent: false`.
    setupPlazoPagoDesdeContacto({
      contacto: this.form.controls.contacto,
      plazoPago: this.form.controls.plazo_pago,
      origen: 'proveedor',
      destroyRef: this.destroyRef,
    });

    this.form.controls.contacto.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contacto) => {
        this.contactoCabecera.set(contacto);
        propagarContactoALineas(this.form.controls.cuentas, contacto);
      });

    this.form.controls.centro_costo.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((centroCosto) => {
        this.centroCostoCabecera.set(centroCosto);
        propagarCentroCostoALineas(this.form.controls.cuentas, centroCosto);
      });
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red y solo
    // pedimos las líneas. Sin resolved (fail-open) cae a la carga completa.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as FacturaCompraRead);
      this.loadLineas(Number(id));
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.isSaving() || this.tablasOcupadas()) return;
    if (this.form.invalid || this.form.pending) {
      // `libFocusInvalid` marca todo como tocado y lleva al primer campo con error, pero
      // un panel inactivo está oculto: antes se abre la pestaña que lo contiene.
      const pestana = pestanaConPrimerError(this.form, this.pestanasPorControl);
      if (pestana) this.activeTab.set(pestana);
      return;
    }

    const id = this.id();
    this.isSaving.set(true);
    if (!id) {
      // Alta: las líneas viajan embebidas en el documento.
      this.persistCabecera(id);
      return;
    }

    // Edición: el backend no acepta las líneas en el documento, van por
    // `documento-detalle`. Se guardan los cambios pendientes de ítems y cuentas, en
    // serie (en paralelo, un error cancelaría peticiones en vuelo y el reintento podría
    // duplicar líneas), antes de la cabecera; si fallan, se avisa con el motivo del backend y no se sigue.
    guardarTablasEnSerie(this.tablasEnVivo(), this.toast)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => this.persistCabecera(id),
        error: () => this.isSaving.set(false),
      });
  }

  /** Tablas que se guardan aparte del documento, en el orden en que se guardan. */
  private tablasEnVivo(): readonly TablaEnVivoDocumento[] {
    const { comercialDetalle, cuentaDetalle } = this.t().entities;
    return [
      { tabla: this.detallesTable(), errorAlGuardar: comercialDetalle.toasts.lineSaveError },
      { tabla: this.cuentasTable(), errorAlGuardar: cuentaDetalle.toasts.lineSaveError },
    ];
  }

  /** Tablas de líneas montadas (ítems + cuentas), para el guard de salida. */
  private lineTables(): FlushableLineTable[] {
    return [this.detallesTable(), this.cuentasTable()].filter(
      (table): table is ComercialDocumentoDetallesComponent | ContableDocumentoDetallesComponent =>
        table != null,
    );
  }

  /** Guarda la cabecera (create/update). Asume `isSaving` ya en `true`. */
  private persistCabecera(id: string | undefined): void {
    const toasts = this.t().entities.facturaCompra.form.toasts;
    // En edición se omiten los detalles del payload: van por `documento-detalle` y ya
    // los guardó `saveAll()` de la tabla.
    const payload = formValueToPayload(
      this.form.getRawValue(),
      this.document().documentTypeId,
      !id,
    );
    const operation = id
      ? this.gateway.update(this.document(), Number(id), payload)
      : this.gateway.create(this.document(), payload);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (saved) => {
        this.isSaving.set(false);
        // Guardar limpia el estado "sucio": navegar a la ficha pasa por el guard
        // de salida y, sin esto, el camino feliz preguntaría por cambios ya guardados.
        this.form.markAsPristine();
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        // Guardar termina en la ficha del documento, para revisar lo que quedó
        // almacenado. En alta el id sale de la respuesta del backend; si no
        // viniera, se cae a la lista antes que navegar a una URL inválida.
        const savedId = id ?? extractDocumentoId(saved);
        if (savedId != null) this.navigateToDetail(savedId);
        else this.navigateToList();
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

  /** Lo que se perdería al salir; lo leen el guard de salida y el aviso junto a "Guardar". */
  private cambios(): CambiosDocumento {
    return {
      form: this.form,
      // En alta nada persiste aparte: tocar una línea y salir también pierde trabajo.
      enAlta: !this.id(),
      pendingLines: this.lineTables().reduce((total, table) => total + table.pendingCount(), 0),
      // Dos tablas en vivo: ítems y cuentas contables.
      lineControls: ['detalles', 'cuentas'],
    };
  }

  /** Aviso "Cambios sin guardar" junto al botón. En alta todo está por guardar: no se muestra. */
  protected hayCambios(): boolean {
    return this.isEditMode() && hayCambiosSinGuardar(this.cambios());
  }

  /**
   * Guard de salida: si hay cambios sin guardar (cabecera o líneas), confirma antes
   * de abandonar. Guardar el documento persiste todo y deja el form limpio, así que
   * el camino feliz no pregunta.
   */
  canDeactivate(): boolean | Observable<boolean> {
    return canLeaveDocumentForm({
      ...this.cambios(),
      confirmation: this.confirmation,
      labels: this.t().entities.comercialDetalle,
      cancelLabel: this.t().common.actions.cancel,
    });
  }

  /**
   * Carga completa (cabecera + cuentas). Se usa como fallback de la carga inicial
   * (si el resolver no pre-cargó la cabecera). Los ítems los trae la tabla, de a
   * una página (`paginada`).
   */
  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      cuentas: this.detalleService.cuentasDelDocumento<FacturaLineaRead>(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, cuentas }) => {
          this.applyCabecera(cabecera as FacturaCompraRead);
          this.populateCuentas(cuentas);
        },
        error: () => this.notifyLoadError(),
      });
  }

  /** Carga solo las cuentas (la cabecera ya la aportó el resolver). */
  private loadLineas(id: number): void {
    this.detalleService
      .cuentasDelDocumento<FacturaLineaRead>(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cuentas) => this.populateCuentas(cuentas),
        error: () => this.notifyLoadError(),
      });
  }

  /**
   * Pobla la cabecera en el form. `emitEvent: false`: no disparar el autocálculo
   * y respetar el vencimiento que viene del backend.
   */
  private applyCabecera(read: FacturaCompraRead): void {
    const value = facturaCompraToFormValue(read);
    this.form.patchValue(value, { emitEvent: false });
    this.resumenBase.set(resumenDesdeCabecera(read));
    // Las cuentas que agregue el usuario en edición nacen con el contacto y el
    // centro de costo del documento, igual que en alta.
    this.contactoCabecera.set(value.contacto ?? null);
    this.centroCostoCabecera.set(value.centro_costo ?? null);
  }

  private populateCuentas(lineas: readonly FacturaLineaRead[]): void {
    reemplazarFilas(
      this.form.controls.cuentas,
      lineas.map((line) => createCuentaDetalleGroup(cuentaDetalleToFormValue(line))),
    );
  }

  private notifyLoadError(): void {
    const toasts = this.t().entities.facturaCompra.form.toasts;
    this.toast.error(toasts.loadError.title, toasts.loadError.desc);
  }

  /** Vuelve a la lista del documento activo, derivando la ruta de `routes.list`. */
  private navigateToList(): void {
    this.navigate(this.document().routes.list);
  }

  /** Abre la ficha del documento guardado (`routes.detail` + id). */
  private navigateToDetail(id: string | number): void {
    this.navigate(this.document().routes.detail, String(id));
  }

  /** Construye la ruta absoluta del documento dentro del tenant y el módulo. */
  private navigate(routePath: string, extra?: string): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const segments = routePath.split('/').filter(Boolean);
    const commands: (string | number)[] = [
      '/t',
      slug,
      currentModuleId(this.activeModule),
      ...segments,
    ];
    if (extra) commands.push(extra);
    void this.router.navigate(commands);
  }
}
