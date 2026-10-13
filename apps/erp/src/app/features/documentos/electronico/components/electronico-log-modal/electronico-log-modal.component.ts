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
import { extractErrorMessage, formatFechaCorta, I18nService, toHora } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ElectronicoLogService } from '../../electronico-log.service';
import type { ElectronicoEvento, ElectronicoLog } from '../../electronico-log.model';
import {
  armarRutas,
  eventoTono,
  validacionTexto,
  type EnvioRuta,
  type EventoTono,
} from '../../electronico-log';

/**
 * Modal **Información** del dropdown "Electrónico": qué pasó con el documento
 * después de emitirlo. Cada correo enviado al cliente se pinta como una ruta de
 * entrega —enviado → entregado → abierto— porque la pregunta de quien lo abre es
 * "¿le llegó?", y la respuesta es el último paso de esa ruta. Debajo, las
 * validaciones que reportó la DIAN.
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
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Visibilidad two-way: la ficha la abre seteándola en `true`. */
  readonly visible = model<boolean>(false);
  readonly documentoId = input<number | null>(null);

  protected readonly loading = signal(false);
  /** Mensaje del fallo (el `detail` del backend si lo trae); `null` sin error. */
  protected readonly error = signal<string | null>(null);
  private readonly log = signal<ElectronicoLog | null>(null);

  protected readonly rutas = computed<readonly EnvioRuta[]>(() => {
    const log = this.log();
    return log ? armarRutas(log) : [];
  });

  protected readonly validaciones = computed<readonly string[]>(() =>
    (this.log()?.validaciones ?? []).map(validacionTexto),
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

  protected tono(evento: string): EventoTono {
    return eventoTono(evento);
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

  /**
   * Hora del paso. Si cayó otro día que el envío se antepone la fecha: "abierto a
   * las 09:10" no dice nada si fue tres días después.
   */
  protected horaPaso(evento: ElectronicoEvento, ruta: EnvioRuta): string {
    const date = new Date(evento.fecha);
    if (Number.isNaN(date.getTime())) return '';
    const mismoDia = ruta.fecha && formatFechaCorta(ruta.fecha) === formatFechaCorta(date);
    return mismoDia ? toHora(date) : `${formatFechaCorta(date)} ${toHora(date)}`;
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
