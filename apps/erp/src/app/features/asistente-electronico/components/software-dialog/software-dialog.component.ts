import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import {
  FieldErrorComponent,
  FocusInvalidDirective,
  MascaraUuidDirective,
  UUID_LARGO,
  UUID_PLACEHOLDER,
  uuidValidator,
} from '@reddoc/ui';
import { I18nService, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ElectronicoService } from '../../electronico.service';
import type { Observable } from 'rxjs';
import type { SoftwareRedEDoc, SoftwareTipo } from '../../electronico.model';
import { parseRedEDocError, repartirErrores, type RedEDocError } from '../../rededoc-error';
import { RededocErrorComponent } from '../rededoc-error/rededoc-error.component';

/**
 * Modal del software de un tipo de documento en RedEDoc: identificador, PIN y
 * set de pruebas que da la DIAN en su portal de habilitación.
 *
 * Sin `software` lo crea (`software-crear/`); con él, lo actualiza
 * (`software-actualizar/`, PATCH por `id`) arrancando con sus datos. El PIN
 * nunca vuelve del backend: al actualizar es opcional y vacío conserva el que
 * hay.
 *
 * El tipo lo fija la tarjeta que lo abrió, no se elige acá. Los errores que
 * nombran un campo van debajo de su input; el resto, a la banda del pie.
 */
@Component({
  selector: 'app-software-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    MascaraUuidDirective,
    RededocErrorComponent,
  ],
  templateUrl: './software-dialog.component.html',
  styles: ':host { display: contents; }',
})
export class SoftwareDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly electronico = inject(ElectronicoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly uuidLargo = UUID_LARGO;
  protected readonly uuidPlaceholder = UUID_PLACEHOLDER;

  readonly visible = model(false);
  /** Tipo de documento del software; lo pone la tarjeta que abre el modal. */
  readonly tipo = input<SoftwareTipo | null>(null);
  /** Software a actualizar; `null` para crear uno nuevo. */
  readonly software = input<SoftwareRedEDoc | null>(null);
  /** Se guardó: quien abrió el modal relee el software. */
  readonly guardado = output<void>();

  protected readonly guardando = signal(false);
  /** Error que no es de un campo puntual; se muestra al pie, junto al botón. */
  protected readonly error = signal<RedEDocError | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    // Los dos los genera la DIAN como UUID: se valida la forma completa antes
    // de enviar, en vez de esperar el rechazo de RedEDoc.
    identificador: ['', [Validators.required, uuidValidator]],
    pin: ['', Validators.required],
    test_set_id: ['', [Validators.required, uuidValidator]],
  });

  constructor() {
    // Cada apertura arranca de cero: en blanco al crear, con los datos del
    // software al actualizar. El PIN nunca queda de una vez a otra.
    effect(() => {
      if (!this.visible()) return;
      const software = this.software();
      untracked(() => {
        const { pin } = this.form.controls;
        pin.setValidators(software ? null : Validators.required);
        this.form.reset({
          identificador: software?.identificador ?? '',
          pin: '',
          test_set_id: software?.test_set_id ?? '',
        });
        this.error.set(null);
      });
    });
  }

  protected cerrar(): void {
    if (!this.guardando()) this.visible.set(false);
  }

  protected onSubmit(): void {
    const tipo = this.tipo();
    if (!tipo || this.form.invalid || this.guardando()) return;

    const raw = this.form.getRawValue();
    // Se pegan desde el portal de la DIAN: un espacio de más los invalida.
    const datos = {
      identificador: raw.identificador.trim(),
      test_set_id: raw.test_set_id.trim(),
    };
    const pin = raw.pin.trim();
    const software = this.software();
    const dict = this.t().asistenteElectronico.habilitaciones;
    const peticion: Observable<void> = software
      ? this.electronico.actualizarSoftware({
          id: software.id,
          ...datos,
          // PATCH: sin PIN se conserva el que ya tiene.
          ...(pin ? { pin } : {}),
        })
      : this.electronico.crearSoftware({ tipo, ...datos, pin });
    const exito = software ? dict.toasts.actualizado : dict.toasts.creado;

    this.guardando.set(true);
    this.error.set(null);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.guardando.set(false);
        this.toast.success(exito.title, exito.desc);
        this.visible.set(false);
        this.guardado.emit();
      },
      error: (err: unknown) => {
        this.guardando.set(false);
        const { identificador, pin: pinControl, test_set_id } = this.form.controls;
        this.error.set(
          repartirErrores(parseRedEDocError(err, dict.errorAccion.generico), {
            identificador,
            pin: pinControl,
            test_set_id,
          }),
        );
      },
    });
  }
}
