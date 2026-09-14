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
import { Observable, forkJoin, of } from 'rxjs';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { TabsModule } from 'primeng/tabs';
import { TextareaModule } from 'primeng/textarea';
import { FieldErrorComponent, PageActionsComponent } from '@reddoc/ui';
import {
  FormErrorService,
  I18nService,
  calcularResumen,
  startOfToday,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ActiveModuleStore, currentModuleId, documentoBreadcrumb } from '@erp/core/erp-modules';
import { ErpContactoSelectComponent, ErpApiSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import {
  DocumentoDetalleService,
  ENTITY_DATA_GATEWAY,
  extractDocumentoId,
} from '@erp/core/module-config';
import type { DocumentEntityConfig } from '@erp/core/module-config';
import type { CanComponentDeactivate } from '@erp/core/guards/unsaved-changes.guard';
import { canLeaveDocumentForm } from '@erp/core/guards/leave-document-form';
import type { AppDict } from '@erp/i18n';
import { ComercialDocumentoDetallesComponent } from '@erp/features/documentos/comercial/components/comercial-documento-detalles/comercial-documento-detalles.component';
import {
  createComercialDetalleGroup,
  type ComercialDetalleGroup,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.form';
import {
  comercialDetalleToFormValue,
  toLineaCalculo,
  totalCantidad,
} from '@erp/features/documentos/comercial/comercial-documento-detalle.mapper';
import { ComercialDocumentoResumenComponent } from '@erp/features/documentos/comercial/components/comercial-documento-resumen/comercial-documento-resumen.component';
import type { ComercialDetalleRead } from '@erp/features/documentos/comercial/comercial-documento-detalle.model';
import type { ComercialDetalleFormRawValue } from '@erp/features/documentos/comercial/comercial-documento-detalle.types';
import { precioListaDeContacto } from '@erp/features/documentos/comercial/precio-lista-contacto';
import { DocumentoPagosComponent } from '@erp/features/documentos/pagos/components/documento-pagos/documento-pagos.component';
import {
  guardarTablasEnSerie,
  primeraTablaIncompleta,
  registrarPagosDeAlta,
  type TablaEnVivoDocumento,
} from '@erp/features/documentos/tablas-en-vivo';
import {
  createPagoGroup,
  type PagoFormRawValue,
  type PagoGroup,
} from '@erp/features/documentos/pagos/pago.form';
import { calcularPagos } from '@erp/features/documentos/pagos/pago.calculo';
import { pagoReadToFormValue } from '@erp/features/documentos/pagos/pago.mapper';
import type { PagoRead } from '@erp/features/documentos/pagos/pago.model';
import { DocumentoPagoService } from '@erp/features/documentos/pagos/pago.service';
import { notaVentaToFormValue, formValueToPayload } from '../../nota-documento.mapper';
import type { NotaVentaRead } from '../../nota-documento.model';
import {
  METODO_PAGO_ENDPOINT,
  NOTA_VENTA_REFERENCIA_ENDPOINT,
  SEDE_ENDPOINT,
} from '../../nota-documento.constants';

/**
 * Formulario de alta/edición de la **cabecera** de una nota de venta. Lo comparten
 * la nota crédito (2) y la nota débito (3): la cabecera es idéntica entre ellas y
 * lo único que las distingue —el `documento_tipo`— sale de la config inyectada.
 *
 * Camino A del enfoque híbrido: el documento vive sobre el endpoint genérico
 * `/api/general/documento`. El form recibe el `DocumentEntityConfig` por input
 * binding (resuelto por `activeDocumentResolver`) y deriva de él el
 * `documentTypeId`, el nombre visible y la ruta de la lista.
 *
 * Una nota de venta ajusta una factura de venta (`documento_referencia`) y, como
 * el POS, puede cobrarse en el acto: a la cabecera (cliente, fecha, sede, método
 * de pago, comentario) le suma la **sección de pagos** —compartida— y la **tabla
 * de detalles** comercial. La pestaña de pagos solo aparece si la config declara
 * `hasPagos` (la nota crédito sí, la débito no); los pagos no viajan en el documento:
 * transaccionan aparte contra `documento-pago`. Detalles / Pagos / Más información
 * van en tabs dentro de la card de la cabecera, con un único resumen debajo.
 *
 * La misma página cubre crear y editar: sin `:id` → alta; con `:id` → edición.
 */
@Component({
  selector: 'app-nota-documento-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    ConfirmDialogModule,
    DatePickerModule,
    TabsModule,
    TextareaModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpContactoSelectComponent,
    ErpApiSelectComponent,
    ComercialDocumentoDetallesComponent,
    DocumentoPagosComponent,
    ComercialDocumentoResumenComponent,
  ],
  providers: [ConfirmationService],
  templateUrl: './nota-documento-form.component.html',
  styleUrl: './nota-documento-form.component.scss',
})
export class NotaDocumentoFormComponent implements OnInit, CanComponentDeactivate {
  private readonly fb = inject(FormBuilder);
  private readonly gateway = inject(ENTITY_DATA_GATEWAY);
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly pagoService = inject(DocumentoPagoService);

  protected readonly t = this.i18n.t;

  /** Tabla de líneas: el padre le delega el flush y el conteo de pendientes. */
  private readonly detallesTable = viewChild(ComercialDocumentoDetallesComponent);

  /** Tabla de pagos: en edición persiste en vivo; en alta registra los pagos al crear. */
  private readonly pagosTable = viewChild(DocumentoPagosComponent);

  /** Guardado en curso dentro de la tabla de pagos: el botón Guardar espera a que termine. */
  protected readonly tablasOcupadas = computed(() => this.pagosTable()?.ocupado() ?? false);

  /** Tab activo del bloque (Detalles / Pagos / Más información). */
  protected readonly activeTab = signal<'detalles' | 'pagos' | 'informacion'>('detalles');

  /**
   * ¿Se cobra en el acto? Lo declara la config (`hasPagos`): solo entonces hay
   * pestaña de pagos, filas de pagos en el resumen y pagos que cargar y registrar.
   */
  protected readonly conPagos = computed(() => this.document().hasPagos === true);

  protected readonly sedeEndpoint = SEDE_ENDPOINT;
  protected readonly metodoPagoEndpoint = METODO_PAGO_ENDPOINT;
  protected readonly referenciaEndpoint = NOTA_VENTA_REFERENCIA_ENDPOINT;

  /** Filtra el autocomplete de contacto a clientes. */
  protected readonly contactoParams = { cliente: 'True' } as const;

  /** Cliente seleccionado: acota (y habilita) el select de documento referencia. */
  private readonly contactoId = signal<number | null>(null);

  /**
   * Parámetros del select de documento referencia. Se reevalúa al cambiar el
   * cliente: lista sus facturas de venta aprobadas (serializador `referencia`).
   * Vacío mientras no haya cliente (el control queda deshabilitado y no consulta).
   *
   * TODO(nota-venta): pendiente confirmar con backend el contrato del endpoint de
   * referencia antes de reactivar el select (está comentado en el template).
   * Supuestos actuales (calcados del legacy):
   *  - GET `/general/documento/` con `serializador=referencia`.
   *  - Se filtra a facturas de venta aprobadas del cliente
   *    (`documento_tipo__venta=True`, `documento_tipo__operacion=1`, `estado_aprobado=true`).
   *  - El serializer devuelve `{ id, numero, fecha }` (se pinta `numero - fecha`).
   */
  protected readonly referenciaParams = computed<Record<string, string>>(() => {
    const id = this.contactoId();
    if (id == null) return {};
    const params: Record<string, string> = {
      contacto_id: String(id),
      documento_tipo__venta: 'true',
      documento_tipo__operacion: '1',
      estado_aprobado: 'true',
      serializador: 'referencia',
    };
    return params;
  });

  /** Documento activo inyectado por `activeDocumentResolver` vía router binding. */
  readonly document = input.required<DocumentEntityConfig>();

  /** Id del documento a editar (route param `:id`). Ausente en modo alta. */
  readonly id = input<string>();

  /**
   * Cabecera pre-cargada por `editableDocumentResolver` (clave de ruta
   * `documentoEdit`). En edición llega ya resuelta y el form la reúsa; `null`/
   * ausente en alta o si el resolver hizo fail-open.
   */
  readonly documentoEdit = input<unknown>();

  protected readonly isEditMode = computed(() => !!this.id());

  /** Id del documento como número (`null` en alta); alimenta la transacción por línea. */
  protected readonly documentId = computed(() => {
    const id = this.id();
    return id ? Number(id) : null;
  });
  protected readonly isSaving = signal(false);

  /** Espejo reactivo de las líneas para calcular el total del documento. */
  protected readonly lines = signal<readonly ComercialDetalleFormRawValue[]>([]);

  /** Resumen del documento: lo pinta el aside bajo los tabs, igual en Detalles y Pagos. */
  protected readonly resumen = computed(() => calcularResumen(this.lines().map(toLineaCalculo)));

  /** Total del documento: contra él se validan y se prellenan los pagos. */
  protected readonly totalGeneral = computed(() => this.resumen().total);

  /** Suma de cantidades de las líneas (fila «Total cantidad» del resumen). */
  protected readonly cantidadTotal = computed(() => totalCantidad(this.lines()));

  /** Espejo reactivo de los pagos para el resumen y la validación del guardado. */
  protected readonly pagosLines = signal<readonly PagoFormRawValue[]>([]);

  /** Recibido, saldo y exceso de los pagos frente al total. */
  protected readonly pagosResumen = computed(() =>
    calcularPagos(this.pagosLines(), this.totalGeneral()),
  );

  /**
   * `true` cuando lo recibido supera el total. No bloquea guardar —el backend lo frena
   * al aprobar—: tiñe la pestaña y el resumen avisa que no se podrá aprobar.
   */
  protected readonly pagosExceden = computed(() => this.pagosResumen().excede);

  /**
   * Nombre del documento activo (Nota crédito, Nota débito…). La página la
   * comparte la familia: el título sale de la config, no de un literal i18n.
   */
  protected readonly documentName = computed(() =>
    this.i18n.translate(this.document().displayNameKey),
  );

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
    documento_referencia: this.fb.control<ErpSelectOption | null>({ value: null, disabled: true }),
    sede: this.fb.control<ErpSelectOption | null>(null),
    metodo_pago: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    comentario: this.fb.control<string | null>(null, Validators.maxLength(500)),
    detalles: new FormArray<ComercialDetalleGroup>([]),
    pagos: new FormArray<PagoGroup>([]),
  });

  constructor() {
    // El documento referencia depende del cliente: al cambiarlo se acota su lista
    // (vía `referenciaParams`), se habilita el control y se limpia la referencia
    // previa (pertenecía a otro cliente).
    this.form.controls.contacto.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contacto) => this.onContactoChange(contacto?.id ?? null));

    // Espejo reactivo de las líneas para el total del documento.
    this.form.controls.detalles.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.lines.set(this.form.controls.detalles.getRawValue()));

    // Espejo reactivo de los pagos para el resumen y la validación del guardado.
    this.form.controls.pagos.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.pagosLines.set(this.form.controls.pagos.getRawValue()));
  }

  /** Getter tipado del `FormArray` de pagos (para el chip de la pestaña y la carga). */
  protected get pagos(): FormArray<PagoGroup> {
    return this.form.controls.pagos;
  }

  /** Lista de precios del cliente elegido; cotiza cada ítem de la tabla de líneas. */
  protected precioListaId(): number | null {
    return precioListaDeContacto(this.form.controls.contacto.value);
  }

  ngOnInit(): void {
    const id = this.id();
    if (!id) return;
    // En edición la cabecera ya viene del resolver: la aplicamos sin red y solo
    // pedimos líneas y pagos. Sin resolved (fail-open) cae a la carga completa.
    const prefetched = this.documentoEdit();
    if (prefetched) {
      this.applyCabecera(prefetched as NotaVentaRead);
      this.loadLineas(Number(id));
    } else {
      this.loadDocumento(Number(id));
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving() || this.tablasOcupadas()) return;

    const id = this.id();
    if (!id) {
      // Alta: las líneas viajan embebidas; los pagos se registran al crear.
      this.isSaving.set(true);
      this.persistCabecera(id);
      return;
    }

    // Edición: líneas y pagos transaccionan aparte, así que antes de guardar el
    // documento se persisten los pendientes. Si alguno está incompleto se abre su
    // pestaña y se avisa, en vez de guardar a medias.
    const tablas = this.tablasEnVivo();
    const incompleta = primeraTablaIncompleta(tablas);
    if (incompleta) {
      this.activeTab.set(incompleta.tab);
      this.toast.warn(incompleta.incompleta.title, incompleta.incompleta.desc);
      return;
    }

    this.isSaving.set(true);
    // Flush silencioso y en serie (líneas, luego pagos): el éxito lo confirma el toast
    // del documento; el helper solo reporta la tabla que falle.
    guardarTablasEnSerie(tablas, this.toast)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        complete: () => this.persistCabecera(id),
        error: () => this.isSaving.set(false),
      });
  }

  /** Tablas que transaccionan en vivo, en el orden en que se guardan. */
  private tablasEnVivo(): readonly TablaEnVivoDocumento<'detalles' | 'pagos'>[] {
    const { comercialDetalle, documentoPago } = this.t().entities;
    return [
      {
        tabla: this.detallesTable(),
        tab: 'detalles',
        incompleta: comercialDetalle.toasts.incompleteLines,
        errorAlGuardar: comercialDetalle.toasts.lineSaveError,
      },
      {
        tabla: this.conPagos() ? this.pagosTable() : undefined,
        tab: 'pagos',
        incompleta: documentoPago.toasts.incompletos,
        errorAlGuardar: documentoPago.toasts.saveError,
      },
    ];
  }

  /** Guarda la cabecera (create/update). Asume `isSaving` ya en `true`. */
  private persistCabecera(id: string | undefined): void {
    const toasts = this.t().entities.notaVenta.form.toasts;
    // En edición se omiten los detalles del payload: ya transaccionaron en vivo.
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
        // Guardar limpia el estado "sucio": navegar a la ficha pasa por el guard
        // de salida y, sin esto, el camino feliz preguntaría por cambios ya guardados.
        this.form.markAsPristine();
        const ok = id ? toasts.editSuccess : toasts.createSuccess;
        this.toast.success(ok.title, ok.desc);
        // Guardar termina en la ficha del documento, para revisar lo que quedó
        // almacenado. En alta el id sale de la respuesta del backend; si no
        // viniera, se cae a la lista antes que navegar a una URL inválida.
        const savedId = id ?? extractDocumentoId(saved);
        if (savedId == null) {
          this.isSaving.set(false);
          this.navigateToList();
          return;
        }
        // Alta: los pagos no viajan embebidos, se registran contra el documento recién
        // creado. Si alguno falla el documento ya existe: el helper avisa con el motivo
        // del backend y se abre igual su ficha, desde donde se edita para agregarlos.
        registrarPagosDeAlta(
          id || !this.conPagos() ? undefined : this.pagosTable(),
          Number(savedId),
          this.toast,
          this.t().entities.documentoPago.toasts.noRegistrados,
        )
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            complete: () => {
              this.isSaving.set(false);
              this.navigateToDetail(savedId);
            },
          });
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

  /**
   * Guard de salida: si hay líneas o pagos sin guardar, confirma antes de abandonar
   * para no perderlos. Solo aplica en edición.
   */
  canDeactivate(): boolean | Observable<boolean> {
    const pagosPendientes = this.conPagos() ? (this.pagosTable()?.pendingCount() ?? 0) : 0;
    return canLeaveDocumentForm({
      form: this.form,
      pendingLines: (this.detallesTable()?.pendingCount() ?? 0) + pagosPendientes,
      // En edición los pagos transaccionan aparte, como las líneas: los cuenta `pendingLines`.
      lineControls: this.id() ? ['detalles', 'pagos'] : ['detalles'],
      confirmation: this.confirmation,
      labels: this.t().entities.comercialDetalle,
      cancelLabel: this.t().common.actions.cancel,
    });
  }

  /**
   * Tras importar líneas en **edición** (ya persistidas vía `masivo/`), recarga el
   * documento para reflejar las nuevas líneas con sus ids y montos autoritativos.
   */
  protected onImported(): void {
    const id = this.documentId();
    if (id != null) this.loadDocumento(id);
  }

  /**
   * Carga completa (cabecera + líneas + pagos). La cabecera no embebe líneas ni
   * pagos: se traen aparte de `documento-detalle` y `documento-pago`. Se usa como
   * fallback de la carga inicial y para recargar tras importar.
   */
  private loadDocumento(id: number): void {
    forkJoin({
      cabecera: this.gateway.getById(this.document(), id),
      lineas: this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
      pagos: this.listarPagos(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cabecera, lineas, pagos }) => {
          this.applyCabecera(cabecera as NotaVentaRead);
          this.populateLineas(lineas);
          this.populatePagos(pagos);
        },
        error: () => this.notifyLoadError(),
      });
  }

  /** Carga líneas y pagos (la cabecera ya la aportó el resolver). */
  private loadLineas(id: number): void {
    forkJoin({
      lineas: this.detalleService.listarPorDocumento<ComercialDetalleRead>(id),
      pagos: this.listarPagos(id),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ lineas, pagos }) => {
          this.populateLineas(lineas);
          this.populatePagos(pagos);
        },
        error: () => this.notifyLoadError(),
      });
  }

  /** Pagos del documento; la nota que no se cobra en el acto no los pide. */
  private listarPagos(id: number): Observable<readonly PagoRead[]> {
    return this.conPagos() ? this.pagoService.listarPorDocumento(id) : of([]);
  }

  /**
   * Pobla la cabecera en el form. `emitEvent: false`: no disparar el efecto de
   * cambio de cliente (que limpiaría la referencia recién cargada). Como el patch
   * no emite, sincronizamos el estado del select de referencia a mano. Los pagos no
   * vienen en la cabecera: se traen de `documento-pago` junto con las líneas.
   */
  private applyCabecera(read: NotaVentaRead): void {
    this.form.patchValue(notaVentaToFormValue(read), { emitEvent: false });
    this.syncReferenciaState();
  }

  /**
   * Sincroniza el estado del select de documento referencia con el cliente
   * cargado (sin limpiar la referencia). Se usa al poblar en edición, donde el
   * patch no emitió eventos.
   */
  private syncReferenciaState(): void {
    const id = this.form.controls.contacto.value?.id ?? null;
    this.contactoId.set(id);
    const ref = this.form.controls.documento_referencia;
    if (id == null) ref.disable({ emitEvent: false });
    else ref.enable({ emitEvent: false });
  }

  /** Reacciona a un cambio de cliente hecho por el usuario. */
  private onContactoChange(id: number | null): void {
    this.contactoId.set(id);
    const ref = this.form.controls.documento_referencia;
    // La referencia previa pertenecía a otro cliente: se descarta.
    ref.setValue(null, { emitEvent: false });
    if (id == null) ref.disable({ emitEvent: false });
    else ref.enable({ emitEvent: false });
  }

  /** Reemplaza el `FormArray` de pagos con los del backend (anulados incluidos, de solo lectura). */
  private populatePagos(pagos: readonly PagoRead[]): void {
    const arr = this.form.controls.pagos;
    arr.clear();
    for (const pago of pagos) arr.push(createPagoGroup(pagoReadToFormValue(pago)));
  }

  /** Reemplaza el FormArray de detalles con las líneas recibidas. */
  private populateLineas(lineas: readonly ComercialDetalleRead[]): void {
    const detalles = this.form.controls.detalles;
    detalles.clear();
    for (const line of lineas)
      detalles.push(createComercialDetalleGroup(comercialDetalleToFormValue(line)));
    this.lines.set(detalles.getRawValue());
  }

  private notifyLoadError(): void {
    const toasts = this.t().entities.notaVenta.form.toasts;
    this.toast.error(toasts.loadError.title, toasts.loadError.desc);
  }

  /** Etiqueta de una opción del select de referencia: `número - fecha`. */
  protected readonly referenciaLabel = (option: ErpSelectOption): string => {
    const numero = option['numero'];
    const fecha = option['fecha'];
    if (numero != null && numero !== '') {
      return fecha ? `${numero} - ${fecha}` : String(numero);
    }
    return option.nombre || '';
  };

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
