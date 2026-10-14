import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
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
import {
  CIUDAD_FUENTE,
  FormErrorService,
  I18nService,
  SELECT_ENDPOINTS,
  TIPO_PERSONA,
  ToastService,
  calcularDigitoVerificacion,
  numeroIdentificacionUnicoValidator,
  type Ciudad,
  type ErpSelectOption,
} from '@reddoc/core';
import {
  CiudadAutocompleteComponent,
  ErpApiSelectComponent,
  FieldErrorComponent,
  FocusInvalidDirective,
  SoloDigitosDirective,
} from '@reddoc/ui';
import type { AppDict } from '@pos/i18n';
import { clienteCreadoToOpcion, clienteRapidoToPayload } from '../../cliente-rapido.mapper';
import { ClienteRapidoService } from '../../cliente-rapido.service';

/**
 * Alta de un cliente sin salir de la caja: solo lo que el backend exige
 * (identificación, nombre, correo, teléfono, dirección y ciudad). Al guardar,
 * queda elegido en la venta. Los demás datos (lista de precios, plazos,
 * responsabilidad fiscal…) se completan en el ERP.
 */
@Component({
  selector: 'app-cliente-rapido-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    CiudadAutocompleteComponent,
    ErpApiSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
    SoloDigitosDirective,
  ],
  templateUrl: './cliente-rapido-dialog.component.html',
})
export class ClienteRapidoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly toast = inject(ToastService);
  private readonly formErrors = inject(FormErrorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(ClienteRapidoService);

  protected readonly t = this.i18n.t;

  readonly visible = model(false);
  /** Cliente creado, como opción del selector de la venta. */
  readonly creado = output<ErpSelectOption>();

  protected readonly tipoPersonaEndpoint = SELECT_ENDPOINTS.tipoPersona;
  protected readonly identificacionEndpoint = SELECT_ENDPOINTS.identificacion;
  protected readonly ciudadFuente = CIUDAD_FUENTE.erp;

  protected readonly guardando = signal(false);
  private readonly tipoPersona = signal<number | null>(TIPO_PERSONA.NATURAL);
  protected readonly esNatural = computed(() => this.tipoPersona() === TIPO_PERSONA.NATURAL);
  protected readonly identificacionParams = computed<Record<string, string>>(() => {
    const id = this.tipoPersona();
    const params: Record<string, string> = {};
    if (id !== null) params['tipo_persona_id'] = String(id);
    return params;
  });

  protected readonly form = this.fb.nonNullable.group({
    tipo_persona: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    identificacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
    numero_identificacion: ['', [Validators.required, Validators.maxLength(20)]],
    nombre_corto: ['', Validators.maxLength(200)],
    nombre1: ['', Validators.maxLength(50)],
    nombre2: ['', Validators.maxLength(50)],
    apellido1: ['', Validators.maxLength(50)],
    apellido2: ['', Validators.maxLength(50)],
    correo: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    telefono: ['', [Validators.required, Validators.maxLength(50)]],
    direccion: ['', [Validators.required, Validators.maxLength(100)]],
    ciudad: this.fb.control<Ciudad | null>(null, Validators.required),
  });

  private readonly numero = signal('');
  protected readonly digitoVerificacion = computed(() =>
    this.numero() ? calcularDigitoVerificacion(this.numero()) : '',
  );

  constructor() {
    const { controls } = this.form;
    controls.tipo_persona.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      this.tipoPersona.set(tipo?.id ?? null);
      this.aplicarValidadoresNombre();
      controls.identificacion.setValue(null);
    });
    controls.numero_identificacion.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((numero) => this.numero.set(numero.trim()));
    controls.numero_identificacion.addAsyncValidators(
      numeroIdentificacionUnicoValidator(
        (datos) => this.service.validar(datos),
        () => controls.identificacion.value?.id ?? null,
        () => null,
      ),
    );
    controls.identificacion.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => controls.numero_identificacion.updateValueAndValidity());

    effect(() => {
      if (!this.visible()) return;
      untracked(() => this.reiniciar());
    });
  }

  protected onSubmit(): void {
    if (this.guardando() || this.form.invalid || this.form.pending) return;
    this.guardando.set(true);
    this.service
      .crear(clienteRapidoToPayload(this.form.getRawValue()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (creado) => {
          this.guardando.set(false);
          const tx = this.t().caja.cliente.toasts.creado;
          this.toast.success(tx.title, tx.desc);
          this.creado.emit(clienteCreadoToOpcion(creado));
          this.visible.set(false);
        },
        error: (err: unknown) => {
          this.guardando.set(false);
          this.formErrors.handle(this.form, err, this.t().caja.cliente.toasts.error);
        },
      });
  }

  protected cerrar(): void {
    if (!this.guardando()) this.visible.set(false);
  }

  private reiniciar(): void {
    this.form.reset({ tipo_persona: { id: TIPO_PERSONA.NATURAL, nombre: '' } });
    this.tipoPersona.set(TIPO_PERSONA.NATURAL);
    this.aplicarValidadoresNombre();
  }

  /** Natural pide nombre y apellido; jurídica, razón social. */
  private aplicarValidadoresNombre(): void {
    const natural = this.esNatural();
    const { nombre_corto, nombre1, apellido1 } = this.form.controls;
    nombre_corto.setValidators(
      natural ? [Validators.maxLength(200)] : [Validators.required, Validators.maxLength(200)],
    );
    nombre1.setValidators(
      natural ? [Validators.required, Validators.maxLength(50)] : [Validators.maxLength(50)],
    );
    apellido1.setValidators(
      natural ? [Validators.required, Validators.maxLength(50)] : [Validators.maxLength(50)],
    );
    nombre_corto.updateValueAndValidity({ emitEvent: false });
    nombre1.updateValueAndValidity({ emitEvent: false });
    apellido1.updateValueAndValidity({ emitEvent: false });
  }
}
