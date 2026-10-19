import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { I18nService, SELECT_ENDPOINTS, TenantService, type ErpSelectOption } from '@reddoc/core';
import { ErpApiSelectComponent, FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { parseRedEDocError } from '@erp/features/asistente-electronico/rededoc-error';
import { COMPRA_CAMPOS } from '@erp/features/configuracion/configuracion.constants';
import {
  compraFormToRecepcionPersona,
  configuracionToCompraForm,
} from '@erp/features/configuracion/configuracion.mapper';
import { ConfiguracionService } from '@erp/features/configuracion/configuracion.service';
import type { DocumentoRecibido } from '../../documento-recibido.model';
import { DocumentoRecibidoService } from '../../documento-recibido.service';
import {
  CONCEPTOS_RECLAMO,
  type EventoRadian,
  type EventoRadianCodigo,
  type EventoRadianConcepto,
  type RegistrarEventoPayload,
} from '../../evento-radian.model';

/** Eventos que llevan persona que recibe, obligatoria. */
const CON_PERSONA: readonly EventoRadianCodigo[] = ['030', '032'];

/** Eventos que cierran el proceso: aceptar o reclamar, uno excluye al otro. */
const CIERRAN: readonly EventoRadianCodigo[] = ['033', '031'];

/**
 * De dónde salió la persona del formulario: la sugerida por la configuración
 * (`com_recepcion_recibe`), ninguna (no hay configurada o no se pudo leer) o
 * todavía se está consultando.
 */
type Sugerencia = 'cargando' | 'configurada' | 'ninguna';

/**
 * Registra un evento RADIAN sobre un documento recibido. Un solo diálogo para
 * los cuatro códigos; el formulario cambia con el código:
 *
 * - 030 / 032: quién recibe, obligatorio. Abre con la persona de Configuración ›
 *   Compra (`com_recepcion_recibe`) como sugerencia y se puede cambiar solo para
 *   este evento; la configuración no se toca.
 * - 031: el concepto del reclamo, obligatorio.
 * - 033: nada que llenar; solo el aviso de que cierra el proceso.
 *
 * Los controles que no aplican al código quedan deshabilitados, así no validan
 * ni viajan. El 400 del backend (orden, plazos…) se queda en la ventana para
 * corregir y reintentar. Al registrar, cierra y emite el evento, que nace
 * `pendiente`: RedEDoc lo envía a la DIAN en segundo plano.
 */
@Component({
  selector: 'app-registrar-evento-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    ErpApiSelectComponent,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './registrar-evento-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrarEventoDialogComponent {
  private readonly service = inject(DocumentoRecibidoService);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly tenant = inject(TenantService);
  private readonly fb = inject(FormBuilder);
  protected readonly t = inject<I18nService<AppDict>>(I18nService).t;

  readonly visible = model(false);
  readonly documento = input<DocumentoRecibido | null>(null);
  readonly codigo = input<EventoRadianCodigo | null>(null);
  readonly registrado = output<EventoRadian>();

  protected readonly endpoints = SELECT_ENDPOINTS;

  /** Mismos controles que Configuración › Compra: el mapper de allá sirve a los dos. */
  protected readonly form = this.fb.group({
    persona: this.fb.group({
      identificacion: this.fb.control<ErpSelectOption | null>(null, Validators.required),
      numero_identificacion: this.fb.nonNullable.control('', [
        Validators.required,
        Validators.maxLength(20),
      ]),
      nombres: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
      apellidos: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(100)]),
      cargo: this.fb.nonNullable.control('', Validators.maxLength(100)),
      area: this.fb.nonNullable.control('', Validators.maxLength(100)),
    }),
    concepto_reclamo: this.fb.control<EventoRadianConcepto | null>(null, Validators.required),
  });

  protected readonly enviando = signal(false);
  /** Mensajes del último intento fallido. */
  protected readonly errores = signal<readonly string[]>([]);
  protected readonly sugerencia = signal<Sugerencia>('cargando');

  protected readonly conPersona = computed(() => {
    const codigo = this.codigo();
    return codigo !== null && CON_PERSONA.includes(codigo);
  });
  protected readonly esReclamo = computed(() => this.codigo() === '031');
  protected readonly cierra = computed(() => {
    const codigo = this.codigo();
    return codigo !== null && CIERRAN.includes(codigo);
  });

  protected readonly titulo = computed(() => {
    const codigo = this.codigo();
    return codigo ? this.t().entities.documentoRecibido.eventos.codigos[codigo] : '';
  });

  protected readonly subtitulo = computed(() => {
    const doc = this.documento();
    if (!doc) return '';
    return this.t()
      .entities.documentoRecibido.registrarEvento.subtitulo.replace('{numero}', doc.numero)
      .replace('{proveedor}', doc.proveedor_razon_social);
  });

  /** Configuración › Compra, para guardar ahí la persona y no escribirla cada vez. */
  protected readonly configuracionLink = computed(() => {
    const slug = this.tenant.currentSlug();
    return slug ? ['/t', slug, 'configuracion'] : null;
  });

  protected readonly conceptoOptions = computed(() => {
    const conceptos = this.t().entities.documentoRecibido.eventos.conceptos;
    return CONCEPTOS_RECLAMO.map((value) => ({ value, label: `${value} · ${conceptos[value]}` }));
  });

  constructor() {
    // Solo valida (y viaja) lo que aplica al código.
    effect(() => {
      const { persona, concepto_reclamo } = this.form.controls;
      if (this.conPersona()) persona.enable({ emitEvent: false });
      else persona.disable({ emitEvent: false });
      if (this.esReclamo()) concepto_reclamo.enable({ emitEvent: false });
      else concepto_reclamo.disable({ emitEvent: false });
    });

    // Al abrir un 030/032, la persona configurada como sugerencia.
    effect(() => {
      if (this.visible() && this.conPersona()) untracked(() => this.sugerirPersona());
    });
  }

  /**
   * Precarga la persona de `com_recepcion_recibe`. Sin toast si falla: el
   * formulario queda vacío y se llena a mano, igual que sin configurar.
   */
  private sugerirPersona(): void {
    this.sugerencia.set('cargando');
    this.configuracion.obtener(COMPRA_CAMPOS, { errorToast: false }).subscribe({
      next: (config) => {
        const persona = configuracionToCompraForm(config);
        this.form.controls.persona.reset(persona);
        this.sugerencia.set(persona.identificacion ? 'configurada' : 'ninguna');
      },
      error: () => this.sugerencia.set('ninguna'),
    });
  }

  protected enviar(): void {
    const doc = this.documento();
    const codigo = this.codigo();
    if (!doc || !codigo || this.enviando()) return;
    if (this.form.invalid) return;

    const { persona, concepto_reclamo } = this.form.getRawValue();
    const recibe = this.conPersona() ? compraFormToRecepcionPersona(persona) : null;
    const payload: RegistrarEventoPayload = {
      id: doc.id,
      codigo,
      ...(recibe && { persona: recibe }),
      ...(this.esReclamo() && concepto_reclamo && { concepto_reclamo }),
    };

    this.enviando.set(true);
    this.errores.set([]);
    this.service.registrarEvento(payload).subscribe({
      next: (evento) => {
        this.enviando.set(false);
        this.registrado.emit(evento);
        this.cerrar();
      },
      error: (err: unknown) => {
        this.enviando.set(false);
        const r = this.t().entities.documentoRecibido.registrarEvento;
        this.errores.set(parseRedEDocError(err, r.errorGenerico).mensajes);
      },
    });
  }

  /** Cierra y deja la ventana limpia para la próxima vez. */
  protected cerrar(): void {
    this.visible.set(false);
    this.errores.set([]);
    this.form.reset();
  }
}
