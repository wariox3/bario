import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { finalize } from 'rxjs';
import {
  extractBlobErrorMessage,
  extractErrorMessage,
  formatFechaCorta,
  I18nService,
  toHora,
  ToastService,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ElectronicoLogService } from '../../electronico-log.service';
import type { ElectronicoLog } from '../../electronico-log.model';
import {
  ETAPAS,
  armarEnvios,
  listarEventos,
  ordenarValidaciones,
  type EnvioDestinatarios,
  type EventoFila,
  type Hito,
} from '../../electronico-log';

/**
 * Modal **Información** del dropdown "Electrónico": qué pasó con el documento
 * después de emitirlo. Una fila por destinatario —el cliente y la copia por
 * separado, porque que la copia lo abra no dice nada del cliente— con su estado
 * y una columna por etapa (enviado, entregado, abierto): la pregunta de quien lo
 * abre es "¿le llegó?", y se responde leyendo la fila del cliente. Debajo, las
 * validaciones que reportó la DIAN. Al pie, renotificar (reenviar el correo) y
 * descargar el XML firmado.
 *
 * Agnóstico del tipo de documento: recibe solo el id.
 */
@Component({
  selector: 'app-electronico-log-modal',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './electronico-log-modal.component.html',
  styleUrl: './electronico-log-modal.component.scss',
})
export class ElectronicoLogModalComponent {
  private readonly service = inject(ElectronicoLogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Visibilidad two-way: la ficha la abre seteándola en `true`. */
  readonly visible = model<boolean>(false);
  readonly documentoId = input<number | null>(null);

  protected readonly loading = signal(false);
  protected readonly isRenotificando = signal(false);
  protected readonly isDescargandoXml = signal(false);
  /** Mensaje del fallo (el `detail` del backend si lo trae); `null` sin error. */
  protected readonly error = signal<string | null>(null);
  private readonly log = signal<ElectronicoLog | null>(null);

  protected readonly etapas = ETAPAS;

  protected readonly envios = computed<readonly EnvioDestinatarios[]>(() => {
    const log = this.log();
    return log ? armarEnvios(log) : [];
  });

  /** Resumen por destinatario o cada evento tal cual lo reportó el proveedor. */
  protected readonly vista = signal<'resumen' | 'eventos'>('resumen');

  protected readonly eventos = computed<readonly EventoFila[]>(() => {
    const log = this.log();
    return log ? listarEventos(log) : [];
  });

  protected readonly totalDestinatarios = computed(() =>
    this.envios().reduce((total, envio) => total + envio.destinatarios.length, 0),
  );

  protected readonly validaciones = computed(() =>
    ordenarValidaciones(this.log()?.validaciones ?? []),
  );

  /** Número del documento según el servicio electrónico (`FE2865`), para el subtítulo. */
  protected readonly numero = computed(
    () => this.log()?.correos.find((c) => c.numeroDocumento)?.numeroDocumento ?? null,
  );

  constructor() {
    // Se consulta cada vez que se abre: el rastro cambia solo (un correo se abre
    // mientras la ficha está en pantalla), así que no se cachea.
    effect(() => {
      if (!this.visible()) return;
      const id = untracked(this.documentoId);
      if (id == null) return;
      untracked(() => this.load(id));
    });
  }

  /** Nombre legible del evento; uno que el dict no conoce cae a su clave sin guiones. */
  protected etiqueta(evento: string): string {
    const conocido = this.t().documentActions.electronicoLog.eventos[evento];
    if (conocido) return conocido;
    const plano = evento.replace(/_/g, ' ');
    return plano.charAt(0).toUpperCase() + plano.slice(1);
  }

  /** `11/10/2026 · 21:46` */
  protected fechaHora(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${formatFechaCorta(date)} · ${toHora(date)}`;
  }

  /** `13/10/2026 · 16:15:55`: en el detalle varios eventos caen en el mismo minuto. */
  protected fechaHoraSegundos(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const segundos = String(date.getSeconds()).padStart(2, '0');
    return `${formatFechaCorta(date)} · ${toHora(date)}:${segundos}`;
  }

  /**
   * Hora de la etapa. Si cayó otro día que el envío se antepone la fecha:
   * "abierto a las 09:10" no dice nada si fue tres días después.
   */
  protected horaHito(hito: Hito, envio: EnvioDestinatarios): string {
    const date = new Date(hito.fecha);
    if (Number.isNaN(date.getTime())) return '';
    const envioFecha = envio.fecha ? new Date(envio.fecha) : null;
    const mismoDia = envioFecha && formatFechaCorta(envioFecha) === formatFechaCorta(date);
    return mismoDia ? toHora(date) : `${formatFechaCorta(date)} ${toHora(date)}`;
  }

  /** Reenvía el correo y vuelve a consultar: el envío nuevo aparece en la tabla. */
  protected onRenotificar(): void {
    const id = this.documentoId();
    if (id == null || this.isRenotificando()) return;
    const ts = this.t().documentActions.electronicoLog.acciones.toasts;
    this.isRenotificando.set(true);
    this.service
      .renotificar(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isRenotificando.set(false)),
      )
      .subscribe({
        next: () => {
          this.toast.success(ts.renotificarSuccess.title, ts.renotificarSuccess.desc);
          this.load(id);
        },
        error: (err: unknown) => {
          this.toast.error(
            ts.renotificarError.title,
            extractErrorMessage(err, ts.renotificarError.desc),
          );
        },
      });
  }

  protected onDescargarXml(): void {
    const id = this.documentoId();
    if (id == null || this.isDescargandoXml()) return;
    const ts = this.t().documentActions.electronicoLog.acciones.toasts;
    this.isDescargandoXml.set(true);
    this.service
      .descargarXml(id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDescargandoXml.set(false)),
      )
      .subscribe({
        error: (err: unknown) => {
          // El cuerpo del error llega como Blob: el motivo del backend hay que leerlo.
          void extractBlobErrorMessage(err, ts.xmlError.desc).then((mensaje) =>
            this.toast.error(ts.xmlError.title, mensaje),
          );
        },
      });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.log.set(null);
    this.service
      .consultar(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ log }) => {
          this.log.set(log);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(
            extractErrorMessage(err, this.t().documentActions.electronicoLog.loadError.desc),
          );
        },
      });
  }
}
