import { ChangeDetectionStrategy, Component, inject, model, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { FileCardComponent } from '@erp/core/components/file-card/file-card.component';
import { FileDropzoneComponent } from '@erp/core/components/file-dropzone/file-dropzone.component';
import type { ArchivoRechazo } from '@erp/core/components/file-dropzone/validar-archivo';
import { parseRedEDocError } from '@erp/features/asistente-electronico/rededoc-error';
import { CARGA_ACCEPT } from '../../documento-recibido.constants';
import { DocumentoRecibidoService } from '../../documento-recibido.service';

/** Tope de tamaño de la carga: un ZIP de factura pesa unos cientos de KB. */
const MAX_MB = 10;

/**
 * Carga a mano de un documento que el proveedor no mandó al buzón: el ZIP que
 * entrega la DIAN o su XML. Un archivo por vez, como el endpoint.
 *
 * El error se queda en la ventana, junto al archivo, para poder corregir y
 * reintentar sin volver a elegirlo. Al cargar bien, cierra y avisa por
 * `cargado` para que la bandeja se recargue.
 */
@Component({
  selector: 'app-cargar-documento-dialog',
  standalone: true,
  imports: [ButtonModule, DialogModule, FileCardComponent, FileDropzoneComponent],
  templateUrl: './cargar-documento-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CargarDocumentoDialogComponent {
  private readonly service = inject(DocumentoRecibidoService);
  protected readonly t = inject<I18nService<AppDict>>(I18nService).t;

  readonly visible = model(false);
  readonly cargado = output<void>();

  protected readonly accept = CARGA_ACCEPT;
  protected readonly maxMb = MAX_MB;

  protected readonly archivo = signal<File | null>(null);
  protected readonly cargando = signal(false);
  /** Mensajes del último intento fallido (rechazo local o error del backend). */
  protected readonly errores = signal<readonly string[]>([]);

  protected onArchivo(file: File): void {
    this.archivo.set(file);
    this.errores.set([]);
  }

  protected onRechazo(motivo: ArchivoRechazo): void {
    const c = this.t().entities.documentoRecibido.carga;
    this.errores.set([motivo === 'tipo' ? c.rechazoTipo : c.rechazoTamano]);
  }

  protected quitar(): void {
    this.archivo.set(null);
    this.errores.set([]);
  }

  protected cargar(): void {
    const file = this.archivo();
    if (!file || this.cargando()) return;
    this.cargando.set(true);
    this.errores.set([]);
    this.service.cargar(file).subscribe({
      next: () => {
        this.cargando.set(false);
        this.cargado.emit();
        this.cerrar();
      },
      error: (err: unknown) => {
        this.cargando.set(false);
        const c = this.t().entities.documentoRecibido.carga;
        this.errores.set(parseRedEDocError(err, c.errorGenerico).mensajes);
      },
    });
  }

  /** Cierra y deja la ventana limpia para la próxima vez. */
  protected cerrar(): void {
    this.visible.set(false);
    this.archivo.set(null);
    this.errores.set([]);
  }
}
