import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, Subscription, catchError, map, of, startWith, switchMap, timer } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { I18nService, ToastService, extractErrorMessage } from '@reddoc/core';
import { FieldErrorComponent, FocusInvalidDirective } from '@reddoc/ui';
import {
  CASO_DESCRIPCION_MAX,
  type CasoResumen,
  type CasoTipo,
  MesaAyudaService,
} from '../../mesa-ayuda/mesa-ayuda.service';
import type { ContenedoresTranslationsHost } from '../../i18n';

/** Tipo con el que la mesa de ayuda recibe una idea de mejora. */
const TIPO_IDEA: CasoTipo = 'SOP';

/** Lo que muestra «Tus ideas»: los mismos 3 que devuelve el backend. */
const MAX_IDEAS = 3;

/** Lo que queda a la vista el acuse «Recibida» antes de volver a la ayuda del campo. */
const ACUSE_MS = 6000;

/** Lo que la idea recién enviada lleva el tinte sky antes de apagarse (en 2.4 s, por CSS). */
const HALO_MS = 900;

/** Desde cuántos caracteres se muestra el contador contra el tope del backend. */
const CONTADOR_DESDE = CASO_DESCRIPCION_MAX - 500;

/** Etapas del trayecto de un caso, en el orden en que avanza. */
export type EtapaIdea = 'recibida' | 'evaluacion' | 'respondida' | 'cerrada';

const ETAPAS: readonly EtapaIdea[] = ['recibida', 'evaluacion', 'respondida', 'cerrada'];

/** La etapa es la más avanzada que el caso ya marcó. */
export function etapaDeCaso(caso: CasoResumen): EtapaIdea {
  if (caso.estado_cerrado) return 'cerrada';
  if (caso.estado_respuesta) return 'respondida';
  if (caso.estado_atendido) return 'evaluacion';
  return 'recibida';
}

/** Color de cada etapa: el tramo recorrido y el rótulo lo comparten. */
const TONO_ETAPA: Record<EtapaIdea, string> = {
  recibida: 'text-slate-500',
  evaluacion: 'text-sky-700',
  respondida: 'text-sky-700',
  cerrada: 'text-emerald-700',
};

interface IdeaVista {
  readonly id: number;
  readonly descripcion: string;
  readonly etapa: EtapaIdea;
  /** Índice de la etapa (0-3): cuántos tramos del trayecto van llenos, menos uno. */
  readonly paso: number;
  readonly tono: string;
}

type EstadoLista =
  | { readonly tipo: 'cargando' }
  | { readonly tipo: 'error' }
  | { readonly tipo: 'listo'; readonly casos: readonly CasoResumen[] };

/**
 * Las dos cards al pie del inicio: el campo para contar qué mejorar o
 * automatizar y, al lado, el trayecto de las últimas ideas enviadas.
 *
 * Cada idea es un caso de la mesa de ayuda. Al enviarla entra primera en
 * «Tus ideas» como «Recibida», sin esperar a que la mesa la liste: el texto
 * que se acaba de escribir es el que aparece al lado.
 */
@Component({
  selector: 'lib-ideas',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    TextareaModule,
    FieldErrorComponent,
    FocusInvalidDirective,
  ],
  templateUrl: './ideas.component.html',
  host: { class: 'block' },
})
export class IdeasComponent {
  private readonly mesaAyuda = inject(MesaAyudaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = computed(() => this.i18n.t().contenedores.ideas);
  protected readonly etapas = ETAPAS;
  protected readonly max = CASO_DESCRIPCION_MAX;

  // Un `FormGroup` y no el control suelto: `libFocusInvalid` cuelga del `formGroup` del `<form>`.
  protected readonly form = new FormGroup({
    descripcion: new FormControl('', {
      nonNullable: true,
      // `pattern` rechaza un texto hecho solo de espacios, que `required` deja pasar.
      validators: [Validators.required, Validators.pattern(/\S/)],
    }),
  });

  protected readonly descripcion = this.form.controls.descripcion;

  protected readonly enviando = signal(false);
  /** Acuse tras enviar: reemplaza un rato la ayuda bajo el campo. */
  protected readonly acuse = signal(false);
  /** Id de la idea recién enviada: entra con un tinte sky que se apaga solo. */
  protected readonly recienId = signal<number | null>(null);

  private acuseTimer?: Subscription;

  private readonly recargar$ = new Subject<void>();

  /** Ideas enviadas en esta visita, antes de que la mesa las liste. */
  private readonly enviadas = signal<readonly CasoResumen[]>([]);

  private readonly lista = toSignal(
    this.recargar$.pipe(
      startWith(undefined),
      switchMap(() =>
        // Sin toast: la card ya dice que no se pudo cargar y ofrece reintentar.
        this.mesaAyuda.misCasos({ errorToast: false }).pipe(
          map((casos): EstadoLista => ({ tipo: 'listo', casos })),
          catchError(() => of<EstadoLista>({ tipo: 'error' })),
          startWith<EstadoLista>({ tipo: 'cargando' }),
        ),
      ),
    ),
    { initialValue: { tipo: 'cargando' } as EstadoLista },
  );

  protected readonly estado = computed(() => this.lista().tipo);

  protected readonly ideas = computed<readonly IdeaVista[]>(() => {
    const lista = this.lista();
    const delBackend = lista.tipo === 'listo' ? lista.casos : [];
    const ids = new Set(delBackend.map((c) => c.id));
    const nuevas = this.enviadas().filter((c) => !ids.has(c.id));
    return [...nuevas, ...delBackend].slice(0, MAX_IDEAS).map((caso) => {
      const etapa = etapaDeCaso(caso);
      return {
        id: caso.id,
        descripcion: caso.descripcion,
        etapa,
        paso: ETAPAS.indexOf(etapa),
        tono: TONO_ETAPA[etapa],
      };
    });
  });

  /** Las ideas recién enviadas se muestran aunque la lista haya fallado. */
  protected readonly mostrarError = computed(
    () => this.estado() === 'error' && this.ideas().length === 0,
  );

  private readonly largo = toSignal(this.descripcion.valueChanges.pipe(map((v) => v.length)), {
    initialValue: 0,
  });

  protected readonly contador = computed(() => {
    const largo = this.largo();
    return largo >= CONTADOR_DESDE ? `${largo} / ${CASO_DESCRIPCION_MAX}` : null;
  });

  reintentar(): void {
    this.recargar$.next();
  }

  /** Ctrl/⌘ + Enter envía sin soltar el teclado. */
  onAtajo(event: Event): void {
    const tecla = event as KeyboardEvent;
    if (!tecla.ctrlKey && !tecla.metaKey) return;
    event.preventDefault();
    // Por el submit del `<form>` y no `enviar()` directo: así `libFocusInvalid`
    // también marca el campo si se intenta enviar en blanco.
    (event.target as HTMLElement).closest('form')?.requestSubmit();
  }

  enviar(): void {
    if (this.descripcion.invalid || this.enviando()) return;

    const descripcion = this.descripcion.value.trim();
    this.enviando.set(true);
    this.mesaAyuda
      // Sin toast del interceptor: el 400/502 trae su motivo y se avisa abajo.
      .crearCaso({ tipo: TIPO_IDEA, descripcion }, { errorToast: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ id }) => {
          this.enviando.set(false);
          this.enviadas.update((prev) => [
            {
              id,
              descripcion,
              estado_atendido: false,
              estado_respuesta: false,
              estado_cerrado: false,
            },
            ...prev,
          ]);
          this.recienId.set(id);
          timer(HALO_MS)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.recienId.set(null));
          this.form.reset();
          this.mostrarAcuse();
        },
        error: (err) => {
          this.enviando.set(false);
          const toasts = this.t().toasts.error;
          this.toast.error(toasts.title, extractErrorMessage(err, toasts.desc));
        },
      });
  }

  private mostrarAcuse(): void {
    this.acuseTimer?.unsubscribe();
    this.acuse.set(true);
    this.acuseTimer = timer(ACUSE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.acuse.set(false));
  }
}
