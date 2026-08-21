import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent } from '@reddoc/ui';
import {
  CIUDAD_FUENTE,
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  ToastService,
} from '@reddoc/core';
import { CiudadAutocompleteComponent, ErpApiSelectComponent } from '@reddoc/ui';
import type { Ciudad, ErpSelectOption } from '@reddoc/core';
import { calcularDigitoVerificacion } from '@erp/features/general/masters/contacto/utils/digito-verificacion.util';
import type { AppDict } from '@erp/i18n';
import { ConfiguracionService } from '../../configuracion.service';
import { EMPRESA_CAMPOS } from '../../configuracion.constants';
import { configuracionToEmpresaForm, empresaFormToPayload } from '../../configuracion.mapper';
import type { EmpresaConfigFormValue } from '../../configuracion.mapper';

/**
 * Campos del backend (prefijados) → controles del form (sin prefijo).
 *
 * Sin este mapa, `applyServerErrors` busca un control llamado
 * `gen_empresa_correo`, no lo encuentra y el mensaje del backend termina en un
 * toast en vez de debajo del campo que lo causó. Mismo mapa que declaran las
 * otras dos áreas de configuración.
 */
const EMPRESA_FIELD_MAP = {
  gen_empresa_razon_social: 'razon_social',
  gen_empresa_tipo_persona: 'tipo_persona',
  gen_empresa_identificacion: 'identificacion',
  gen_empresa_numero_identificacion: 'numero_identificacion',
  gen_empresa_digito_verificacion: 'digito_verificacion',
  gen_empresa_direccion: 'direccion',
  gen_empresa_ciudad: 'ciudad',
  gen_empresa_telefono: 'telefono',
  gen_empresa_correo: 'correo',
};

/** Identificación y teléfono son solo dígitos, igual que en el ERP anterior. */
const SOLO_DIGITOS = /^[0-9]+$/;

/**
 * Área "Empresa" — datos de identidad de la empresa (`gen_empresa_*`).
 *
 * Auto-contenido como las demás áreas: lee y guarda solo sus campos
 * (`EMPRESA_CAMPOS`). Hoy lo renderiza el paso «Datos de la empresa» del
 * asistente de facturación electrónica; la pestaña de Configuración sigue sin
 * habilitarse (basta con sumar un `p-tabpanel` en el shell cuando se decida).
 *
 * Los dos inputs/outputs existen por ese doble hogar: dentro del asistente el
 * botón dice "Guardar y continuar" y quien lo hospeda necesita saber cuándo
 * guardó para avanzar de paso. Suelto, guarda y se queda donde está.
 */
@Component({
  selector: 'app-empresa-config',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FieldErrorComponent,
    ErpApiSelectComponent,
    CiudadAutocompleteComponent,
  ],
  templateUrl: './empresa-config.component.html',
})
export class EmpresaConfigComponent {
  private readonly fb = inject(FormBuilder);
  private readonly configuracionService = inject(ConfiguracionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Etiqueta del botón de guardar. Sin valor, "Guardar". */
  readonly submitLabel = input<string>();

  /**
   * Solo lectura: deshabilita los campos y esconde el botón de guardar.
   *
   * Lo usa el asistente cuando la empresa ya está dada de alta como emisor de
   * facturación electrónica: esos datos ya viajaron al proveedor y editarlos
   * acá dejaría al ERP diciendo una cosa y al proveedor otra. Quien bloquea
   * también tiene que explicar por qué — el motivo no lo sabe este componente.
   */
  readonly readonly = input(false);

  /**
   * Se emite tras un guardado exitoso, con lo que quedó guardado.
   *
   * Lleva el valor y no un `void` porque el host suele necesitar mostrarlo: el
   * asistente confirma el alta del emisor enseñando la razón social y el NIT
   * que está por registrar.
   */
  readonly saved = output<EmpresaConfigFormValue>();

  /** Endpoints `seleccionar` de catálogos compartidos, para los `<app-api-*>` del template. */
  protected readonly endpoints = SELECT_ENDPOINTS;

  /** Las ciudades del ERP salen del catálogo del tenant, no del global. */
  protected readonly ciudadFuente = CIUDAD_FUENTE.erp;

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);

  /**
   * Reglas portadas del ERP anterior, con los topes del schema del contenedor.
   *
   * Obligatorios: todos menos teléfono — que allá tampoco lo era. El dígito de
   * verificación no lleva validador porque no se escribe: lo calcula el número
   * de identificación y viaja igual (`getRawValue()` incluye los deshabilitados).
   *
   * Los `maxLength` son los del backend (`PatchedGenConfiguracionRequest`), para
   * que el tope se avise en el campo y no vuelva como un 400.
   */
  protected readonly form = this.fb.group({
    razon_social: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.minLength(3),
      Validators.maxLength(450),
    ]),
    tipo_persona: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    identificacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    numero_identificacion: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.maxLength(20),
      Validators.pattern(SOLO_DIGITOS),
    ]),
    digito_verificacion: this.fb.nonNullable.control({ value: '', disabled: true }),
    direccion: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    ciudad: this.fb.control<Ciudad | null>(null, Validators.required),
    telefono: this.fb.nonNullable.control('', [
      Validators.minLength(7),
      Validators.maxLength(50),
      Validators.pattern(SOLO_DIGITOS),
    ]),
    correo: this.fb.nonNullable.control('', [
      Validators.required,
      Validators.email,
      Validators.maxLength(255),
    ]),
  });

  constructor() {
    this.form.controls.numero_identificacion.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((numero) =>
        this.form.controls.digito_verificacion.setValue(calcularDigitoVerificacion(numero ?? ''), {
          emitEvent: false,
        }),
      );

    this.cargar();

    // El dígito de verificación nunca se escribe a mano: queda deshabilitado
    // pase lo que pase con el resto del formulario.
    effect(() => {
      if (this.readonly()) {
        this.form.disable({ emitEvent: false });
      } else {
        this.form.enable({ emitEvent: false });
        this.form.controls.digito_verificacion.disable({ emitEvent: false });
      }
    });
  }

  protected cargar(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.configuracionService
      .obtener(EMPRESA_CAMPOS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.form.reset(configuracionToEmpresaForm(config));
          this.form.markAsPristine();
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadFailed.set(true);
          const toasts = this.t().configuracion.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  protected onSave(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving.set(true);

    const toasts = this.t().configuracion.toasts;
    const valor = this.form.getRawValue();
    const payload = empresaFormToPayload(valor);

    this.configuracionService
      .actualizar(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.form.markAsPristine();
          this.toast.success(toasts.saveSuccess.title, toasts.saveSuccess.desc);
          this.saved.emit(valor);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.formErrors.handle(this.form, err, toasts.saveError.title, EMPRESA_FIELD_MAP);
        },
      });
  }
}
