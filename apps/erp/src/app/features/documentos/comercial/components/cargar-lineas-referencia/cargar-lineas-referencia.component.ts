import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, map } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import {
  DocumentoDetalleService,
  I18nService,
  ToastService,
  lineaReferenciaToFormValue,
  type ComercialDetalleRead,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { ComercialDocumentoDetallesComponent } from '../comercial-documento-detalles/comercial-documento-detalles.component';

/**
 * Botón "Cargar líneas" que acompaña al select de documento referencia de una
 * nota: reemplaza las líneas de la nota por las del documento referenciado (la
 * factura que devuelve, o el documento soporte que ajusta).
 *
 * - Si la nota ya tiene líneas con ítem pide confirmación; una fila vacía no
 *   cuenta, no hay nada que perder.
 * - El reemplazo lo hace la tabla (`reemplazarLineas`), siempre en memoria: en
 *   edición las líneas viejas se borran y las nuevas se crean recién al guardar
 *   la nota, así que salir sin guardar la deja como estaba.
 * - No copia los pagos del documento referenciado (el legacy sí, y la nota
 *   quedaba con dinero que pertenece a la factura).
 *
 * Usa el `ConfirmationService` del formulario que lo contiene (el que pinta el
 * `<p-confirmdialog>`).
 */
@Component({
  selector: 'app-cargar-lineas-referencia',
  standalone: true,
  imports: [ButtonModule],
  template: `
    <p-button
      type="button"
      icon="pi pi-download"
      [label]="t().entities.comercialDetalle.cargarReferencia.button"
      severity="secondary"
      [outlined]="true"
      size="small"
      [loading]="cargando()"
      [disabled]="bloqueado()"
      (onClick)="onCargar()"
    />
  `,
  styleUrl: './cargar-lineas-referencia.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargarLineasReferenciaComponent {
  private readonly detalleService = inject(DocumentoDetalleService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del documento referenciado; sin él el botón queda deshabilitado. */
  readonly referenciaId = input<number | null>(null);
  /** Tabla de líneas de la nota: hace el reemplazo. */
  readonly tabla = input.required<ComercialDocumentoDetallesComponent | undefined>();
  /** Deshabilita el botón mientras el formulario guarda (la tabla ocupada ya lo bloquea). */
  readonly disabled = input<boolean>(false);

  protected readonly cargando = signal(false);

  /** Sin referencia, con el form guardando o con la tabla persistiendo líneas no se carga. */
  protected readonly bloqueado = computed(
    () => this.referenciaId() == null || this.disabled() || (this.tabla()?.ocupado() ?? false),
  );

  protected onCargar(): void {
    const referenciaId = this.referenciaId();
    const tabla = this.tabla();
    if (referenciaId == null || !tabla || this.cargando()) return;
    if (
      !tabla
        .detalles()
        .getRawValue()
        .some((line) => line.item != null)
    ) {
      this.cargar(referenciaId, tabla);
      return;
    }
    const textos = this.t().entities.comercialDetalle.cargarReferencia;
    this.confirmation.confirm({
      header: textos.confirmHeader,
      message: textos.confirmMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: textos.confirmAccept,
      rejectLabel: this.t().common.actions.cancel,
      accept: () => this.cargar(referenciaId, tabla),
    });
  }

  private cargar(referenciaId: number, tabla: ComercialDocumentoDetallesComponent): void {
    const toasts = this.t().entities.comercialDetalle.cargarReferencia.toasts;
    this.cargando.set(true);
    this.detalleService
      .listarPorDocumento<ComercialDetalleRead>(referenciaId)
      .pipe(
        map((lineas) => {
          const values = lineas.map(lineaReferenciaToFormValue);
          if (values.length > 0) tabla.reemplazarLineas(values);
          return values.length;
        }),
        finalize(() => this.cargando.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (cargadas) => {
          if (cargadas === 0) {
            this.toast.warn(toasts.sinLineas.title, toasts.sinLineas.desc);
            return;
          }
          tabla.detalles().markAsDirty();
          this.toast.success(toasts.success.title, toasts.success.desc);
        },
        error: () => this.toast.error(toasts.error.title, toasts.error.desc),
      });
  }
}
