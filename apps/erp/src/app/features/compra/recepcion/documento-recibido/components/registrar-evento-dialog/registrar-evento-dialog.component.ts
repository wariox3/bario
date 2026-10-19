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
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { I18nService, SELECT_ENDPOINTS, TenantService, type ErpSelectOption } from '@reddoc/core';
import { ErpApiSelectComponent, FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import { catchError, map, of, switchMap } from 'rxjs';
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
  type RecepcionPersona,
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
 * Qué pasó con la persona configurada al registrar el evento: no se pidió
 * actualizarla, se actualizó, o el evento salió pero guardarla falló.
 */
export type PersonaGuardada = 'no' | 'si' | 'fallo';

export interface EventoRegistrado {
  readonly evento: EventoRadian;
  readonly personaGuardada: PersonaGuardada;
}

/** ¿Son la misma persona? Cargo y área ausentes cuentan como vacíos. */
function mismaPersona(a: RecepcionPersona, b: RecepcionPersona): boolean {
  return (
    a.identificacion === b.identificacion &&
    a.numero_identificacion === b.numero_identificacion &&
    a.nombres === b.nombres &&
    a.apellidos === b.apellidos &&
    (a.cargo ?? '') === (b.cargo ?? '') &&
    (a.area ?? '') === (b.area ?? '')
  );
}

/**
 * Registra un evento RADIAN sobre un documento recibido. Un solo diálogo para
 * los cuatro códigos; el formulario cambia con el código:
 *
 * - 030 / 032: quién recibe, obligatorio. Abre con la persona de Configuración ›
 *   Compra (`com_recepcion_recibe`) como sugerencia y se puede cambiar para este
 *   evento. Si difiere de la configurada (o no hay ninguna), un check ofrece
 *   guardarla también allá: se guarda **después** de que el evento sale, porque
 *   un 400 puede deberse justo a un dato de la persona.
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
    CheckboxModule,
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
  readonly registrado = output<EventoRegistrado>();

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
    /** Guardar también la persona en Configuración › Compra. Desmarcado: es opt-in. */
    guardarPersona: this.fb.nonNullable.control(false),
  });

  protected readonly enviando = signal(false);
  /** Mensajes del último intento fallido. */
  protected readonly errores = signal<readonly string[]>([]);
  protected readonly sugerencia = signal<Sugerencia>('cargando');
  /** La persona configurada, normalizada, para saber si el formulario la cambió. */
  private readonly configurada = signal<RecepcionPersona | null>(null);

  /** La persona tal como viajaría con lo que hay escrito ahora. */
  private readonly personaActual = toSignal(this.form.controls.persona.valueChanges, {
    initialValue: this.form.controls.persona.getRawValue(),
  });

  /**
   * ¿Se ofrece guardar la persona en la configuración? Solo en 030/032, ya leída
   * la sugerencia, y si hay algo que guardar: no hay ninguna configurada, o la
   * escrita difiere de la configurada.
   */
  protected readonly ofrecerGuardar = computed(() => {
    if (!this.conPersona() || this.sugerencia() === 'cargando') return false;
    const configurada = this.configurada();
    if (!configurada) return true;
    // Se lee para recalcular a cada tecla; el valor completo sale de `getRawValue`.
    this.personaActual();
    const actual = compraFormToRecepcionPersona(this.form.controls.persona.getRawValue());
    return actual === null || !mismaPersona(actual, configurada);
  });

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
    this.configurada.set(null);
    this.configuracion.obtener(COMPRA_CAMPOS, { errorToast: false }).subscribe({
      next: (config) => {
        const persona = configuracionToCompraForm(config);
        this.form.controls.persona.reset(persona);
        this.configurada.set(compraFormToRecepcionPersona(persona));
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

    const { persona, concepto_reclamo, guardarPersona } = this.form.getRawValue();
    const recibe = this.conPersona() ? compraFormToRecepcionPersona(persona) : null;
    const guardar = guardarPersona && this.ofrecerGuardar() ? recibe : null;
    const payload: RegistrarEventoPayload = {
      id: doc.id,
      codigo,
      ...(recibe && { persona: recibe }),
      ...(this.esReclamo() && concepto_reclamo && { concepto_reclamo }),
    };

    this.enviando.set(true);
    this.errores.set([]);
    this.service
      .registrarEvento(payload)
      .pipe(
        // El evento ya salió: guardar la persona no lo deshace, solo se avisa si falla.
        switchMap((evento) =>
          guardar
            ? this.configuracion
                .actualizar({ com_recepcion_recibe: guardar }, { errorToast: false })
                .pipe(
                  map((): EventoRegistrado => ({ evento, personaGuardada: 'si' })),
                  catchError(() => of<EventoRegistrado>({ evento, personaGuardada: 'fallo' })),
                )
            : of<EventoRegistrado>({ evento, personaGuardada: 'no' }),
        ),
      )
      .subscribe({
        next: (registrado) => {
          this.enviando.set(false);
          this.registrado.emit(registrado);
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
