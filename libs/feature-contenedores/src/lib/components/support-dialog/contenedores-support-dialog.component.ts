import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
  AUTH_SERVICE,
  ContenedorService,
  ErpSelectOption,
  extractErrorMessage,
  I18nService,
  ToastService,
} from '@reddoc/core';
import {
  ErpApiAutocompleteComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
} from '@reddoc/ui';
import type { ContenedoresTranslationsHost } from '../../i18n';

/**
 * Todos los contenedores de la plataforma, no solo los del usuario. Solo los
 * `listo`: a uno que se está creando o falló el backend le responde 409.
 */
const ADMINISTRAR_ENDPOINT = '/contenedor/cliente/administrar/';
const ADMINISTRAR_PARAMS: Record<string, string> = { estado: 'listo' };

/**
 * Modal del staff para entrar a cualquier contenedor como soporte, sin que lo
 * inviten: elige el contenedor y `POST /contenedor/cliente/<id>/soporte/` lo
 * suma a su lista como una membresía más.
 */
@Component({
  selector: 'lib-contenedores-support-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    ReactiveFormsModule,
    ErpApiAutocompleteComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './contenedores-support-dialog.component.html',
  styleUrl: './contenedores-support-dialog.component.scss',
})
export class ContenedoresSupportDialogComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AUTH_SERVICE);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly endpoint = ADMINISTRAR_ENDPOINT;
  protected readonly params = ADMINISTRAR_PARAMS;

  readonly visible = input<boolean>(false);
  readonly visibleChange = output<boolean>();
  /** El contenedor ya quedó en la lista del usuario: el padre recarga. */
  readonly added = output<void>();

  protected readonly isSaving = signal(false);

  /**
   * Sin MFA el backend responde 403. Se avisa de entrada en vez de dejar que la
   * persona elija un contenedor para enterarse al final. Solo un `false`
   * explícito bloquea: si `/me/` no trajera el dato, decide el backend.
   */
  protected readonly sinMfa = computed(() => this.authService.currentUser()?.mfa_activo === false);

  protected readonly form = new FormGroup({
    contenedor: new FormControl<ErpSelectOption | null>(null, Validators.required),
  });

  onSubmit(): void {
    const contenedor = this.form.controls.contenedor.value;
    if (this.form.invalid || !contenedor || this.isSaving() || this.sinMfa()) return;

    this.isSaving.set(true);
    const toasts = this.t().contenedores.support.toasts;
    this.contenedorService
      // Sin toast del interceptor: el 403/409 trae su motivo y se avisa abajo.
      .abrirSoporte(contenedor.id, { errorToast: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success(
            toasts.success.title,
            toasts.success.desc.replace('{nombre}', contenedor.nombre),
          );
          this.added.emit();
        },
        error: (err) => {
          this.isSaving.set(false);
          this.toastService.error(toasts.error.title, extractErrorMessage(err, toasts.error.desc));
        },
      });
  }

  onCancel(): void {
    this.visibleChange.emit(false);
  }
}
