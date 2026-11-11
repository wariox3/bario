import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import {
  Contenedor,
  ContenedorService,
  type ErpSelectOption,
  extractErrorMessage,
  I18nService,
  ToastService,
} from '@reddoc/core';
import { ErpApiSelectComponent, FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { ContenedoresTranslationsHost } from '../../i18n';

/** Opción del selector: la membresía con lo que se muestra y se busca. */
interface CandidatoOption extends ErpSelectOption {
  readonly usuario_email: string;
}

/**
 * Elegir el nuevo propietario y confirmar con la clave.
 *
 * Los candidatos salen de `transferible/` (todas las membresías menos la del
 * propietario y las de soporte). El endpoint no declara búsqueda, así que se
 * traen todos y se le pasan al `lib-api-select` como `catalogo`: su buscador
 * filtra en memoria por nombre y correo.
 *
 * El error del backend (clave incorrecta, membresía que ya no sirve) se avisa
 * en línea con su `detail`, por eso la petición va sin el toast del interceptor.
 */
@Component({
  selector: 'lib-contenedor-transfer-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    PasswordModule,
    ErpApiSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './contenedor-transfer-form.component.html',
})
export class ContenedorTransferFormComponent implements OnInit {
  private readonly contenedorService = inject(ContenedorService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly contenedor = input.required<Contenedor>();
  readonly transferred = output<void>();
  readonly cancelled = output<void>();

  protected readonly form = this.fb.group({
    usuario_cliente: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    password: this.fb.nonNullable.control('', Validators.required),
  });

  protected readonly candidatos = signal<readonly CandidatoOption[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly isSaving = signal(false);
  /** Lo que respondió el backend al intentar transferir. */
  protected readonly submitError = signal<string | null>(null);

  /** Cargado y sin nadie: el selector no tendría nada que ofrecer. */
  protected readonly sinCandidatos = computed(
    () => !this.isLoading() && !this.loadError() && this.candidatos().length === 0,
  );

  protected readonly warning = computed(() =>
    this.t().contenedores.transfer.warning.replace('{nombre}', this.contenedor().cliente_nombre),
  );

  /** Nombre y correo: dos personas pueden llamarse igual. */
  protected readonly etiqueta = (option: ErpSelectOption): string => {
    const { nombre, usuario_email } = option as CandidatoOption;
    return nombre === usuario_email ? nombre : `${nombre} · ${usuario_email}`;
  };

  constructor() {
    // Un error del intento anterior deja de valer en cuanto se cambia algo.
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.submitError.set(null));
  }

  ngOnInit(): void {
    this.cargarCandidatos();
  }

  protected cargarCandidatos(): void {
    this.isLoading.set(true);
    this.loadError.set(false);
    this.contenedorService
      .getTransferibles(this.contenedor().cliente_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (miembros) => {
          this.candidatos.set(
            miembros.map((m) => ({
              id: m.id,
              nombre: m.usuario_nombre_corto || m.usuario_email,
              usuario_email: m.usuario_email,
            })),
          );
          this.isLoading.set(false);
        },
        error: () => {
          this.loadError.set(true);
          this.isLoading.set(false);
        },
      });
  }

  protected onSubmit(): void {
    const { usuario_cliente: destino, password } = this.form.getRawValue();
    if (this.form.invalid || destino === null || this.isSaving()) return;

    this.isSaving.set(true);
    this.contenedorService
      .transferir(
        this.contenedor().cliente_id,
        { usuario_cliente: destino.id, password },
        { errorToast: false },
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          const exito = this.t().contenedores.transfer.success;
          this.toastService.success(exito.title, exito.desc.replace('{nombre}', destino.nombre));
          this.transferred.emit();
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.submitError.set(
            extractErrorMessage(err, this.t().contenedores.transfer.genericError),
          );
        },
      });
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}
