import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PasswordModule } from 'primeng/password';
import { ToastService, extractErrorMessage } from '@reddoc/core';
import { FieldErrorComponent } from '@reddoc/ui';
import { SeguridadService } from '../../services/seguridad.service';

function passwordsMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const nueva = group.get('passwordNueva');
    const confirmar = group.get('passwordConfirmar');
    if (!nueva || !confirmar) return null;

    if (nueva.value && confirmar.value && nueva.value !== confirmar.value) {
      confirmar.setErrors({ ...confirmar.errors, notMatching: true });
      return { notMatching: true };
    }

    if (confirmar.errors?.['notMatching']) {
      const { notMatching: _, ...rest } = confirmar.errors;
      confirmar.setErrors(Object.keys(rest).length ? rest : null);
    }

    return null;
  };
}

@Component({
  selector: 'app-cambiar-password-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule, PasswordModule, ReactiveFormsModule, FieldErrorComponent],
  templateUrl: './cambiar-password-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CambiarPasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly seguridadService = inject(SeguridadService);
  private readonly toast = inject(ToastService);

  readonly visible = input(false);
  readonly visibleChange = output<boolean>();
  /** Emitido cuando la contraseña se cambió correctamente. */
  readonly changed = output<void>();

  readonly isSaving = signal(false);

  readonly form = this.fb.group(
    {
      passwordActual: ['', Validators.required],
      passwordNueva: ['', [Validators.required, Validators.minLength(8)]],
      passwordConfirmar: ['', Validators.required],
    },
    { validators: [passwordsMatchValidator()] },
  );

  constructor() {
    // El modal es efímero: cada apertura empieza en limpio.
    effect(() => {
      if (this.visible()) this.form.reset();
    });
  }

  get actualControl() {
    return this.form.controls.passwordActual;
  }
  get nuevaControl() {
    return this.form.controls.passwordNueva;
  }
  get confirmarControl() {
    return this.form.controls.passwordConfirmar;
  }

  onCancel(): void {
    if (this.isSaving()) return;
    this.visibleChange.emit(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const { passwordActual, passwordNueva } = this.form.getRawValue();
    this.seguridadService.cambiarClave(passwordActual!, passwordNueva!).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.form.reset();
        this.toast.success(
          'Contraseña actualizada',
          'Tu contraseña ha sido cambiada correctamente.',
        );
        this.changed.emit();
        this.visibleChange.emit(false);
      },
      error: (err) => {
        this.toast.error('Error', extractErrorMessage(err, 'No se pudo cambiar la contraseña.'));
        this.isSaving.set(false);
      },
    });
  }
}
