import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import type { MenuItem } from 'primeng/api';
import { Menu, MenuModule } from 'primeng/menu';
import {
  extractErrorMessage,
  I18nService,
  ToastService,
  type DocumentoEstados,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import {
  DocumentoElectronicoEmisionService,
  DocumentoElectronicoErrorService,
} from '@erp/core/documento-electronico';
import { ElectronicoLogModalComponent } from '../electronico-log-modal/electronico-log-modal.component';

/**
 * Dropdown **Electrónico** de la ficha de un documento electrónico (factura de
 * venta, documento soporte…): *Emitir* lo envía a la DIAN cuando está aprobado
 * y aún no se notificó, e *Información* abre el rastro de envíos y las
 * validaciones DIAN.
 *
 * Agnóstico del tipo de documento: recibe el id y las banderas de estado, y
 * avisa con `documentoChanged` tras emitir para que la ficha se recargue —el
 * estado electrónico y el CUE cambian en el backend, no aquí—.
 *
 * El botón que lo abre **no** vive aquí: lo declara la ficha dentro de la
 * botonera (`actionsEnd`) y llama a `toggle($event)` por template ref. El
 * `p-buttongroup` une sus segmentos contando los `p-button` hermanos
 * (`:first-of-type` / `:last-of-type`); envuelto en este componente, el botón
 * sería primero y último a la vez y rompería la costura del grupo. Mismo
 * patrón que Utilidades: botón en el grupo, menú fuera.
 *
 * ```html
 * <p-button actionsEnd [label]="t().documentActions.electronico.action"
 *   [loading]="electronico.isEmitiendo()" (onClick)="electronico.toggle($event)" … />
 * …
 * <app-documento-electronico-menu #electronico [documentoId]="…" [estados]="…" />
 * ```
 */
@Component({
  selector: 'app-documento-electronico-menu',
  standalone: true,
  imports: [MenuModule, ElectronicoLogModalComponent],
  templateUrl: './documento-electronico-menu.component.html',
})
export class DocumentoElectronicoMenuComponent {
  private readonly emision = inject(DocumentoElectronicoEmisionService);
  private readonly errores = inject(DocumentoElectronicoErrorService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly documentoId = input.required<number | null>();
  readonly estados = input.required<DocumentoEstados>();

  /** Se emitió el documento (con o sin error): la ficha debe recargarse. */
  readonly documentoChanged = output<void>();

  private readonly menu = viewChild<Menu>('menu');

  /** `true` mientras viaja el `emitir/`: evita un doble envío a la DIAN. El botón lo pinta como `loading`. */
  readonly isEmitiendo = signal(false);

  /** Control del modal "Información". */
  protected readonly logVisible = signal(false);

  /**
   * Se emite un documento aprobado que todavía no se notificó. Antes de aprobar
   * el backend lo rechaza, y uno ya notificado no tiene nada más que enviar.
   */
  private readonly puedeEmitir = computed(() => {
    const estados = this.estados();
    return !!estados.estado_aprobado && !estados.estado_electronico_notificado;
  });

  /**
   * Entradas del menú. `computed` porque recrear el array en cada detección de
   * cambios le hace perder el primer click a `p-menu`. Información solo se
   * habilita con el documento ya notificado: antes el backend no tiene rastro y
   * responde error ("nunca ha sido notificado").
   */
  protected readonly items = computed<MenuItem[]>(() => [
    {
      label: this.t().documentActions.electronico.emitir,
      icon: 'pi pi-send',
      disabled: !this.puedeEmitir() || this.isEmitiendo(),
      command: () => this.onEmitir(),
    },
    {
      label: this.t().documentActions.electronico.informacion,
      icon: 'pi pi-info-circle',
      disabled: !this.estados().estado_electronico_notificado,
      command: () => this.logVisible.set(true),
    },
  ]);

  /** Abre/cierra el menú; lo llama el botón de la ficha. */
  toggle(event: Event): void {
    this.menu()?.toggle(event);
  }

  /**
   * Envía el documento a la DIAN por el mismo `emitir/` de la utilidad de envío
   * (lote de un solo id). El 200 no dice que salió bien: si el documento vuelve
   * en `con_error`, el aviso muestra los motivos de su último intento.
   */
  private onEmitir(): void {
    const id = this.documentoId();
    if (id == null || this.isEmitiendo()) return;
    this.isEmitiendo.set(true);
    this.emision
      .emitir([id])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isEmitiendo.set(false)),
      )
      .subscribe({
        next: (resultado) => {
          this.documentoChanged.emit();
          if (resultado.con_error.includes(id)) {
            this.avisarErrorEmision(id);
            return;
          }
          const ts = this.t().documentActions.electronico.toasts.emitirSuccess;
          this.toast.success(ts.title, ts.desc);
        },
        error: (err: unknown) => {
          const ts = this.t().documentActions.electronico.toasts.emitirError;
          this.toast.error(ts.title, extractErrorMessage(err, ts.desc));
        },
      });
  }

  /** El documento no se emitió: avisa con los mensajes de su último intento. */
  private avisarErrorEmision(id: number): void {
    const ts = this.t().documentActions.electronico.toasts.emitirError;
    this.errores
      .errores(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const motivos = response.results.map((error) => error.mensaje).join(' ');
          this.toast.error(ts.title, motivos || ts.desc);
        },
        error: () => this.toast.error(ts.title, ts.desc),
      });
  }
}
