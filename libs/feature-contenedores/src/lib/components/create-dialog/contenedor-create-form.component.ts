import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import {
  FieldErrorComponent,
  FocusInvalidDirective,
  PhoneInputComponent,
  normalizarCelular,
} from '@reddoc/ui';
import {
  AUTH_SERVICE,
  Contenedor,
  ContenedorService,
  FormErrorService,
  I18nService,
  ToastService,
} from '@reddoc/core';
import type { ContenedoresTranslationsHost } from '../../i18n';

@Component({
  selector: 'lib-contenedor-create-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    FieldErrorComponent,
    FocusInvalidDirective,
    PhoneInputComponent,
  ],
  templateUrl: './contenedor-create-form.component.html',
  styleUrl: './contenedor-create-form.component.scss',
})
export class ContenedorCreateFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly contenedorService = inject(ContenedorService);
  private readonly toastService = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly authService = inject(AUTH_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly contenedor = input<Contenedor | null>(null);
  readonly created = output<void>();
  readonly updated = output<void>();
  readonly cancelled = output<void>();
  // Nombre de la empresa mientras se crea (overlay full-screen), o null al terminar.
  readonly creationOverlay = output<string | null>();

  readonly isSaving = signal(false);

  readonly isEditMode = computed(() => this.contenedor() !== null);

  readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    schema_name: ['', [Validators.required, Validators.pattern(/^[a-z0-9][a-z0-9_]*$/)]],
    // El backend guarda el celular en E.164 (`+573163557845`): el indicativo va
    // en el mismo campo. El formato lo valida `lib-phone-input` (claves
    // `celularE164` / `celularLongitud`); acá solo queda la obligatoriedad.
    celular: ['', [Validators.required]],
    correo: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    const user = this.authService.currentUser();
    this.form.patchValue({
      correo: user?.email ?? '',
      // El celular del perfil puede venir sin `+` o con separadores (su
      // validación es más laxa): normalizado, el campo no nace inválido.
      celular: normalizarCelular(user?.celular),
    });

    this.form.controls.nombre.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (this.isEditMode()) return;
      const slug = (value ?? '')
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      this.form.controls.schema_name.setValue(slug, { emitEvent: false });
    });

    effect(() => {
      const c = this.contenedor();
      if (!c) return;
      this.form.patchValue({
        nombre: c.nombre,
        schema_name: c.schema_name,
        celular: normalizarCelular(c.celular),
        correo: c.correo ?? '',
      });
      this.form.controls.schema_name.disable();
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.isSaving()) return;
    this.isSaving.set(true);

    const c = this.contenedor();
    if (this.isEditMode() && c) {
      const { nombre, celular, correo } = this.form.getRawValue();
      this.contenedorService
        .updateContenedor(c.cliente_id, {
          nombre: nombre ?? '',
          celular: celular ?? undefined,
          correo: correo ?? undefined,
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            const toasts = this.t().contenedores.edit.toasts;
            this.toastService.success(toasts.success.title, toasts.success.desc);
            this.updated.emit();
          },
          error: (err) => {
            this.isSaving.set(false);
            this.formErrors.handle(this.form, err, this.t().contenedores.edit.toasts.error.title);
          },
        });
    } else {
      this.creationOverlay.emit(this.form.controls.nombre.value ?? '');
      const { nombre, schema_name, celular, correo } = this.form.getRawValue();
      this.contenedorService
        .createContenedor({
          nombre: nombre ?? '',
          schema_name: schema_name ?? '',
          celular: celular ?? '',
          correo: correo ?? '',
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.creationOverlay.emit(null);
            const toasts = this.t().contenedores.create.toasts;
            this.toastService.success(toasts.success.title, toasts.success.desc);
            this.created.emit();
          },
          error: (err) => {
            this.isSaving.set(false);
            this.creationOverlay.emit(null);
            this.formErrors.handle(this.form, err, this.t().contenedores.create.toasts.error.title);
          },
        });
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
