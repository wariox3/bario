import {
  ChangeDetectionStrategy,
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
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Ciudad,
  Identificacion,
  IdentificacionService,
  ToastService,
  FormErrorService,
  normalizarCelular,
} from '@reddoc/core';
import {
  CiudadAutocompleteComponent,
  IdentificacionSelectComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
  PhoneInputComponent,
} from '@reddoc/ui';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { BillingProfile } from '../../../../models/billing-profile.model';
import { BillingProfilesService } from '../../../../services/billing-profiles.service';

interface BillingProfileForm {
  identificacion: FormControl<Identificacion | null>;
  numero: FormControl<string>;
  nombre: FormControl<string>;
  email: FormControl<string>;
  celular: FormControl<string>;
  direccion: FormControl<string>;
  ciudad: FormControl<Ciudad | null>;
}

@Component({
  selector: 'app-billing-profile-create-dialog',
  standalone: true,
  imports: [
    DialogModule,
    InputTextModule,
    ButtonModule,
    ReactiveFormsModule,
    CiudadAutocompleteComponent,
    IdentificacionSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
    PhoneInputComponent,
  ],
  templateUrl: './billing-profile-create-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BillingProfileCreateDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly billingService = inject(BillingProfilesService);
  private readonly identificacionService = inject(IdentificacionService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = input<boolean>(false);
  /** Cuando se pasa un perfil, el diálogo entra en modo edición. */
  readonly profile = input<BillingProfile | null>(null);
  readonly visibleChange = output<boolean>();
  readonly created = output<BillingProfile>();
  readonly updated = output<BillingProfile>();

  readonly isSubmitting = signal(false);
  readonly isEditMode = computed(() => this.profile() !== null);

  readonly dialogTitle = computed(() =>
    this.isEditMode() ? 'Editar datos de facturación' : 'Nuevos datos de facturación',
  );
  readonly dialogSubtitle = computed(() =>
    this.isEditMode()
      ? 'Actualiza los datos del destinatario.'
      : 'Registra el destinatario de la factura electrónica.',
  );
  readonly submitLabel = computed(() => (this.isEditMode() ? 'Guardar cambios' : 'Guardar datos'));

  readonly form: FormGroup<BillingProfileForm> = this.fb.group({
    identificacion: this.fb.control<Identificacion | null>(null, {
      validators: [Validators.required],
    }),
    numero: this.fb.nonNullable.control('', {
      validators: [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(20),
        Validators.pattern(/^[0-9]+$/),
      ],
    }),
    nombre: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(100)],
    }),
    email: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.email],
    }),
    // Wompi exige el celular en E.164 y antes se adivinaba el `+57` al armar su
    // payload. Ahora el indicativo se elige acá y viaja en el propio valor.
    celular: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    direccion: this.fb.nonNullable.control('', {
      validators: [Validators.required, Validators.minLength(5), Validators.maxLength(255)],
    }),
    ciudad: this.fb.control<Ciudad | null>(null, { validators: [Validators.required] }),
  });

  readonly identificacionSelected = signal<Identificacion | null>(null);

  constructor() {
    this.form.controls.identificacion.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.identificacionSelected.set(value));

    // Al abrir: si hay profile → pre-rellena (edit); si no → resetea (create).
    effect(() => {
      if (this.visible()) {
        const p = this.profile();
        if (p) {
          this.hydrateFromProfile(p);
        } else {
          this.resetForm();
        }
      } else {
        this.resetForm();
      }
    });
  }

  // El nombre del tipo (ej. "NIT", "Cédula de ciudadanía") determina la etiqueta.
  readonly nombreLabel = computed(() =>
    this.isNit(this.identificacionSelected()) ? 'Razón social' : 'Nombre completo',
  );

  readonly nombrePlaceholder = computed(() =>
    this.isNit(this.identificacionSelected()) ? 'Empresa Ejemplo S.A.S.' : 'María Camila Restrepo',
  );

  onCancel(): void {
    if (this.isSubmitting()) return;
    this.visibleChange.emit(false);
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);

    const v = this.form.getRawValue();
    const draft = {
      identificacion: v.identificacion,
      numero: v.numero,
      nombre: v.nombre,
      email: v.email,
      celular: v.celular,
      direccion: v.direccion,
      ciudad: v.ciudad,
    };

    const current = this.profile();
    const request$: Observable<BillingProfile> = current
      ? this.billingService.update(current.id, draft)
      : this.billingService.create(draft);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (profile) => {
        this.isSubmitting.set(false);
        if (current) {
          this.toast.success('Perfil actualizado', `${profile.nombre} se guardó correctamente.`);
          this.updated.emit(profile);
        } else {
          this.toast.success('Perfil creado', `${profile.nombre} se guardó correctamente.`);
          this.created.emit(profile);
        }
        this.visibleChange.emit(false);
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.formErrors.handle(
          this.form,
          err,
          current ? 'Error al actualizar el perfil' : 'Error al crear el perfil',
        );
      },
    });
  }

  private hydrateFromProfile(p: BillingProfile): void {
    // El backend devuelve ciudad_id + ciudad_nombre, así que podemos armar el
    // Ciudad sin depender de las sugerencias actuales del autocomplete: PrimeNG
    // muestra la etiqueta a partir del optionLabel del valor. El departamento
    // viaja con él para que el campo muestre lo mismo al reabrir que al elegir
    // (`Amagá — Antioquia`); sin él un municipio homónimo es indistinguible.
    const ciudad =
      p.ciudad_id !== undefined && p.ciudad
        ? { id: p.ciudad_id, nombre: p.ciudad, departamento_nombre: p.departamento ?? null }
        : null;

    this.form.reset({
      identificacion: null,
      numero: p.numero,
      nombre: p.nombre,
      email: p.email,
      celular: normalizarCelular(p.celular),
      direccion: p.direccion,
      ciudad,
    });

    // Resolver Identificacion por nombre desde el catálogo (ya cacheado).
    this.identificacionService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tipos) => {
          const match = tipos.find((t) => t.nombre === p.tipo) ?? null;
          this.form.controls.identificacion.setValue(match);
        },
        error: () => undefined,
      });
  }

  private resetForm(): void {
    this.form.reset({
      identificacion: null,
      numero: '',
      nombre: '',
      email: '',
      celular: '',
      direccion: '',
      ciudad: null,
    });
  }

  onNumeroInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.replace(/\D/g, '').slice(0, 20);
    if (cleaned !== input.value) {
      input.value = cleaned;
      this.form.controls.numero.setValue(cleaned, { emitEvent: false });
    }
  }

  private isNit(ident: Identificacion | null): boolean {
    return !!ident && /nit/i.test(ident.nombre);
  }
}
