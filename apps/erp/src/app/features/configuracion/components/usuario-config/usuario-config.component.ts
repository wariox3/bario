import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ErpApiSelectComponent, FieldErrorComponent } from '@reddoc/ui';
import {
  ConfiguracionUsuarioService,
  ConfiguracionUsuarioStore,
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  ToastService,
  type ErpSelectOption,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import {
  usuarioConfigFormToPayload,
  usuarioConfiguracionToForm,
  type UsuarioConfigFormValue,
} from '../../usuario-configuracion/usuario-configuracion.mapper';

/**
 * Área "Usuario" de la configuración: la sede, el almacén y la caja por defecto
 * de la persona autenticada en este contenedor. Son sugerencias (se proponen al
 * crear un documento o abrir el POS), no restricciones, así que los tres son
 * opcionales y vaciar uno lo quita.
 *
 * La caja tiene que ser de la sede elegida (lo valida el backend): su catálogo
 * se acota por `sede_id` y cambiar la sede vacía la caja.
 */
@Component({
  selector: 'app-usuario-config',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, ErpApiSelectComponent, FieldErrorComponent],
  templateUrl: './usuario-config.component.html',
})
export class UsuarioConfigComponent {
  private readonly fb = inject(FormBuilder);
  private readonly configuracionUsuarioService = inject(ConfiguracionUsuarioService);
  private readonly configuracionUsuarioStore = inject(ConfiguracionUsuarioStore);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly endpoints = SELECT_ENDPOINTS;

  protected readonly loading = signal(true);
  protected readonly loadFailed = signal(false);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    sede: this.fb.control<ErpSelectOption | null>(null),
    almacen: this.fb.control<ErpSelectOption | null>(null),
    caja: this.fb.control<ErpSelectOption | null>(null),
  });

  /** Sede vigente del form; alimenta el filtro del catálogo de cajas. */
  private readonly sede = signal<ErpSelectOption | null>(null);

  /** Sin sede se ofrecen todas las cajas activas; con sede, solo las suyas. */
  protected readonly cajaParams = computed((): Record<string, string> => {
    const sede = this.sede();
    return sede ? { sede_id: String(sede.id) } : {};
  });

  constructor() {
    // Solo el cambio de la persona vacía la caja: `aplicar` resetea con `emitEvent: false`.
    this.form.controls.sede.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((sede) => {
        this.sede.set(sede);
        this.form.controls.caja.setValue(null);
      });
    this.cargar();
  }

  protected cargar(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.configuracionUsuarioService
      .obtener()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.configuracionUsuarioStore.establecer(config);
          this.aplicar(usuarioConfiguracionToForm(config));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.loadFailed.set(true);
        },
      });
  }

  protected onSave(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().configuracion.toasts;
    const payload = usuarioConfigFormToPayload(this.form.getRawValue());

    this.configuracionUsuarioService
      .actualizar(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.isSaving.set(false);
          // Los formularios de alta leen del store: así toman el cambio sin otra petición.
          this.configuracionUsuarioStore.establecer(config);
          this.aplicar(usuarioConfiguracionToForm(config));
          this.toast.success(toasts.saveSuccess.title, toasts.saveSuccess.desc);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.formErrors.handle(this.form, err, toasts.saveError.title);
        },
      });
  }

  /**
   * Pinta lo que devolvió el backend sin disparar el vaciado de la caja; la
   * sede se empuja a mano al signal porque `emitEvent: false` no lo alimenta.
   */
  private aplicar(value: UsuarioConfigFormValue): void {
    this.form.reset(value, { emitEvent: false });
    this.sede.set(value.sede);
  }
}
