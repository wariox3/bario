import {
  Component,
  DestroyRef,
  type ElementRef,
  type OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import {
  CiudadAutocompleteComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
  PageActionsComponent,
  SoloDigitosDirective,
} from '@reddoc/ui';
import {
  CIUDAD_FUENTE,
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ErpApiSelectComponent, ErpAsesorSelectComponent } from '@reddoc/ui';
import type { ErpSelectOption } from '@reddoc/core';
import { ErpApiAutocompleteComponent } from '@reddoc/ui';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { ContactoService } from '../../contacto.service';
import { CONTACTO_LIST_PATH, TIPO_PERSONA } from '../../contacto.constants';
import { contactoToFormValue, formValueToPayload } from '../../contacto.mapper';
import { calcularDigitoVerificacion } from '../../utils/digito-verificacion.util';
import {
  type NumeroIdentificacionSnapshot,
  numeroIdentificacionUnicoValidator,
} from '../../validators/numero-identificacion-unico.validator';

/**
 * Formulario de alta/edición de contacto.
 *
 * Master del módulo General (camino B). La misma página cubre crear y editar:
 * sin `:id` → alta; con `:id` → edición (el id llega por `withComponentInputBinding`).
 */
@Component({
  selector: 'app-contacto-form',
  standalone: true,
  imports: [
    FocusInvalidDirective,
    ReactiveFormsModule,
    BreadcrumbComponent,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    FieldErrorComponent,
    PageActionsComponent,
    ErpApiSelectComponent,
    ErpAsesorSelectComponent,
    ErpApiAutocompleteComponent,
    SoloDigitosDirective,
    CiudadAutocompleteComponent,
  ],
  templateUrl: './contacto-form.component.html',
  styleUrl: './contacto-form.component.scss',
})
export class ContactoFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly contactoService = inject(ContactoService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Ciudades dentro del tenant: el ERP siempre trabaja dentro de uno. */
  protected readonly ciudadFuente = CIUDAD_FUENTE.erp;

  /** Endpoints `seleccionar` de catálogos compartidos, para los `<app-api-*>` del template. */
  protected readonly endpoints = SELECT_ENDPOINTS;

  /** Id del contacto a editar (route param `:id`). Ausente en modo alta. */
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
        label: this.t().entities.contacto.name,
        routerLink: slug ? ['/t', slug, moduleId, ...CONTACTO_LIST_PATH] : undefined,
      },
      { label: this.isEditMode() ? this.t().common.actions.edit : this.t().common.actions.new },
    ];
  });

  private readonly tipoPersona = signal<number | null>(null);
  protected readonly esNatural = computed(() => this.tipoPersona() === TIPO_PERSONA.NATURAL);

  protected readonly esCliente = signal(true);
  protected readonly esProveedor = signal(false);

  /** Cards que se revelan al marcar cada clasificación; usadas para hacer scroll. */
  private readonly clienteSection = viewChild<ElementRef<HTMLElement>>('clienteSection');
  private readonly proveedorSection = viewChild<ElementRef<HTMLElement>>('proveedorSection');

  /**
   * Suprime el auto-scroll mientras se hidrata el form en edición: el
   * `patchValue` dispara `valueChanges` y no queremos saltar la vista al cargar.
   */
  private isHydrating = false;

  /** Consulta DIAN en vuelo (deshabilita el botón y muestra spinner). */
  protected readonly isConsultingDian = signal(false);

  /** Snapshot del contacto cargado en edición; usado por el async validator. */
  private readonly originalIdentificacion = signal<NumeroIdentificacionSnapshot | null>(null);

  protected readonly identificacionParams = computed<Record<string, string>>(() => {
    const id = this.tipoPersona();
    return id !== null ? { tipo_persona_id: String(id) } : ({} as Record<string, string>);
  });

  /** El endpoint de precio devuelve listas de venta y compra; filtramos venta. */
  protected readonly precioParams: Record<string, string> = { venta: 'True' };

  protected readonly form = this.fb.group({
    tipo_persona: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    responsabilidad: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    identificacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    numero_identificacion: ['', Validators.required],
    digito_verificacion: this.fb.control<string>({ value: '', disabled: true }),
    nombre_corto: ['', Validators.required],
    nombre1: [''],
    nombre2: [''],
    apellido1: [''],
    apellido2: [''],
    telefono: ['', Validators.required],
    celular: ['', Validators.required],
    ciudad: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    direccion: ['', Validators.required],
    barrio: [''],
    correo: ['', [Validators.required, Validators.email]],
    cliente: [true],
    proveedor: [false],
    empleado: [false],
    plazo_pago: this.fb.control<ErpSelectOption | null>(null),
    precio: this.fb.control<ErpSelectOption | null>(null),
    asesor: this.fb.control<ErpSelectOption | null>(null),
    correo_facturacion_electronica: ['', Validators.email],
    banco: this.fb.control<ErpSelectOption | null>(null),
    numero_cuenta: [''],
    cuenta_banco_clase: this.fb.control<ErpSelectOption | null>(null),
    plazo_pago_proveedor: this.fb.control<ErpSelectOption | null>(null),
  });

  constructor() {
    this.setupFormReactions();
  }

  ngOnInit(): void {
    const id = this.id();
    if (id) this.loadContacto(Number(id));
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.form.pending || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().entities.contacto.form.toasts;
    const id = this.id();
    const payload = formValueToPayload(this.form.getRawValue());
    const operation = id
      ? this.contactoService.update(Number(id), payload)
      : this.contactoService.create(payload);

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

  /** Habilita la consulta DIAN cuando hay tipo + número de identificación. */
  protected canConsultarDian(): boolean {
    const { identificacion, numero_identificacion } = this.form.controls;
    return (
      !this.isConsultingDian() &&
      identificacion.value?.id != null &&
      !!numero_identificacion.value?.trim()
    );
  }

  /**
   * Consulta la DIAN por tipo + número de identificación y autocompleta nombre y
   * correo. El mapeo depende del tipo de persona (Natural usa `nombre1`;
   * Jurídica usa `nombre_corto`).
   */
  protected consultarDian(): void {
    const { identificacion, numero_identificacion } = this.form.controls;
    const identificacionId = identificacion.value?.id;
    const numero = numero_identificacion.value?.trim();
    if (identificacionId == null || !numero) return;

    const dian = this.t().entities.contacto.form.dian;
    this.isConsultingDian.set(true);

    this.contactoService
      .consultarDian({ identificacion_id: identificacionId, numero_identificacion: numero })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.isConsultingDian.set(false);
          if (!res.encontrado) {
            this.toast.info(dian.notFound.title, dian.notFound.desc);
            return;
          }
          // Solo pisamos un campo si la DIAN devolvió valor: nunca borramos lo
          // que el usuario ya escribió.
          const patch: {
            nombre1?: string;
            nombre_corto?: string;
            correo?: string;
            correo_facturacion_electronica?: string;
          } = {};
          if (res.nombre) {
            // El nombre llega como un único string; en Natural va entero a
            // nombre1 (no es fiable partirlo en nombre/apellido).
            if (this.esNatural()) patch.nombre1 = res.nombre;
            else patch.nombre_corto = res.nombre;
          }
          if (res.correo) {
            patch.correo = res.correo;
            patch.correo_facturacion_electronica = res.correo;
          }
          this.form.patchValue(patch);
          // Si la DIAN trajo un correo malformado ("NO", etc.), el validador
          // email ya marcó el control inválido; lo marcamos touched para que el
          // mensaje de error se muestre bajo el input.
          if (res.correo) {
            this.form.controls.correo.markAsTouched();
            this.form.controls.correo_facturacion_electronica.markAsTouched();
          }
        },
        error: () => {
          this.isConsultingDian.set(false);
          this.toast.error(dian.error.title, dian.error.desc);
        },
      });
  }

  // ── Internos ────────────────────────────────────────────────────────────────

  /**
   * Hace scroll suave hacia la card recién revelada. La sección se renderiza vía
   * `@if` tras actualizar el signal, así que esperamos un frame a que esté en el
   * DOM. No actúa durante la hidratación en edición.
   */
  private scrollToSection(section: () => ElementRef<HTMLElement> | undefined): void {
    if (this.isHydrating || typeof requestAnimationFrame === 'undefined') return;
    requestAnimationFrame(() => {
      section()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /** Conecta los `valueChanges` del form a los signals y al async validator. */
  private setupFormReactions(): void {
    const { controls } = this.form;

    controls.tipo_persona.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const id = value?.id ?? null;
      this.tipoPersona.set(id);
      this.applyTipoPersonaValidators(id);
      controls.identificacion.setValue(null);
    });

    controls.cliente.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      const esCliente = v ?? false;
      const seActivo = esCliente && !this.esCliente();
      this.esCliente.set(esCliente);
      this.applyClienteValidators(esCliente);
      if (seActivo) this.scrollToSection(this.clienteSection);
    });

    controls.proveedor.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
      const esProveedor = v ?? false;
      const seActivo = esProveedor && !this.esProveedor();
      this.esProveedor.set(esProveedor);
      this.applyProveedorValidators(esProveedor);
      if (seActivo) this.scrollToSection(this.proveedorSection);
    });

    // El dígito de verificación se deriva del número de identificación.
    controls.numero_identificacion.valueChanges.pipe(takeUntilDestroyed()).subscribe((numero) => {
      controls.digito_verificacion.setValue(calcularDigitoVerificacion(numero ?? ''), {
        emitEvent: false,
      });
    });

    controls.numero_identificacion.addAsyncValidators(
      numeroIdentificacionUnicoValidator(
        this.contactoService,
        () => controls.identificacion.value?.id ?? null,
        () => this.originalIdentificacion(),
      ),
    );

    // Cambiar el tipo de identificación dispara la revalidación del número.
    controls.identificacion.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      controls.numero_identificacion.updateValueAndValidity();
    });

    // Estado inicial de los requeridos según los flags cliente/proveedor.
    this.applyClienteValidators(controls.cliente.value ?? false);
    this.applyProveedorValidators(controls.proveedor.value ?? false);
  }

  /**
   * `plazo_pago` solo es obligatorio cuando el contacto es cliente; si no, el
   * campo se oculta y exigirlo dejaría el form inválido sin campo visible que
   * corregir.
   */
  private applyClienteValidators(esCliente: boolean): void {
    const { plazo_pago } = this.form.controls;
    plazo_pago.setValidators(esCliente ? [Validators.required] : []);
    plazo_pago.updateValueAndValidity();
  }

  /**
   * `plazo_pago_proveedor` solo es obligatorio cuando el contacto es proveedor:
   * de él salen los días de vencimiento de la factura de compra (entre otros, la
   * importación de eventos DIAN lo usa para armar el documento). Fuera de ese
   * caso la card se oculta y exigirlo dejaría el form inválido sin campo visible.
   */
  private applyProveedorValidators(esProveedor: boolean): void {
    const { plazo_pago_proveedor } = this.form.controls;
    plazo_pago_proveedor.setValidators(esProveedor ? [Validators.required] : []);
    plazo_pago_proveedor.updateValueAndValidity();
  }

  /**
   * Ajusta los validadores de los campos de nombre según el tipo de persona:
   * Jurídica exige `nombre_corto`; Natural exige `nombre1` + `apellido1`.
   */
  private applyTipoPersonaValidators(tipo: number | null): void {
    const esNatural = tipo === TIPO_PERSONA.NATURAL;
    const { nombre_corto, nombre1, apellido1 } = this.form.controls;

    nombre_corto.setValidators(esNatural ? [] : [Validators.required]);
    nombre1.setValidators(esNatural ? [Validators.required] : []);
    apellido1.setValidators(esNatural ? [Validators.required] : []);

    nombre_corto.updateValueAndValidity();
    nombre1.updateValueAndValidity();
    apellido1.updateValueAndValidity();
  }

  private loadContacto(id: number): void {
    this.contactoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.originalIdentificacion.set({
            numero_identificacion: c.numero_identificacion,
            identificacion_id: c.identificacion,
          });
          this.isHydrating = true;
          this.form.patchValue(contactoToFormValue(c));
          this.isHydrating = false;
        },
        error: () => {
          const toasts = this.t().entities.contacto.form.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigateToList(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate([
      '/t',
      slug,
      currentModuleId(this.activeModule),
      ...CONTACTO_LIST_PATH,
    ]);
  }
}
