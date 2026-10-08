import { Component, OnInit, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DividerModule } from 'primeng/divider';
import { AuthService } from '../../../auth/services/auth.service';
import { PerfilService } from '../../services/perfil.service';
import { ToastService, FormErrorService, normalizarCelular } from '@reddoc/core';
import { FieldErrorComponent, FocusInvalidDirective, PhoneInputComponent } from '@reddoc/ui';

@Component({
  selector: 'app-perfil-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DividerModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    PhoneInputComponent,
  ],
  templateUrl: './perfil-form.component.html',
})
export class PerfilFormComponent implements OnInit {
  readonly saved = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly perfilService = inject(PerfilService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);

  readonly isSaving = signal(false);
  readonly isPristine = signal(true);

  readonly form = this.fb.group({
    nombre_corto: ['', Validators.maxLength(255)],
    // El celular se guarda en E.164 (`+573153334455`): el indicativo va en el
    // mismo campo y lo compone `lib-phone-input`, que además valida el formato
    // (`celularE164` / `celularLongitud`). Acá solo queda la obligatoriedad.
    celular: ['', Validators.required],
    numero_identificacion: [
      '',
      [Validators.required, Validators.maxLength(20), Validators.pattern(/^[0-9]{5,20}$/)],
    ],
    email: [{ value: '', disabled: true }],
  });

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.form.patchValue({
        nombre_corto: user.nombre_corto ?? '',
        // Los celulares guardados antes de `lib-phone-input` vienen sin `+` o
        // con separadores: normalizados, el campo no nace inválido. Queda
        // pristine, así que no se escribe nada hasta que la persona guarde.
        celular: normalizarCelular(user.celular),
        numero_identificacion: user.numero_identificacion ?? '',
        email: user.email,
      });
      this.form.markAsPristine();
      this.isPristine.set(true);
    }

    this.form.valueChanges.subscribe(() => {
      this.isPristine.set(this.form.pristine);
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);

    const { nombre_corto, celular, numero_identificacion } = this.form.getRawValue();

    this.perfilService.updatePerfil({ nombre_corto, celular, numero_identificacion }).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.form.markAsPristine();
        this.isPristine.set(true);
        this.saved.emit();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.formErrors.handle(this.form, err, 'Error al guardar perfil');
      },
    });
  }

  get nombreCortoControl() {
    return this.form.controls.nombre_corto;
  }
  get celularControl() {
    return this.form.controls.celular;
  }
  get identificacionControl() {
    return this.form.controls.numero_identificacion;
  }
}
