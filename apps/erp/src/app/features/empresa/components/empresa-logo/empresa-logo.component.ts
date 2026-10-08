import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { I18nService, ToastService } from '@reddoc/core';
import { ErpImageUploadComponent } from '@erp/core/components/image-upload/erp-image-upload.component';
import type { AppDict } from '@erp/i18n';
import { EmpresaLogotipoService } from '../../empresa-logotipo.service';
import { dataUrlToFile } from '../../utils/data-url.util';

/** Nombre del archivo que viaja en el multipart. La extensión la pone el MIME del recorte. */
const NOMBRE_ARCHIVO = 'logotipo';

/**
 * El logotipo de la empresa — el que sale impreso en los documentos.
 *
 * Guarda solo, sin botón: elegir una imagen ya es la decisión, y un "guardar"
 * aparte solo dejaría a la vista mostrando un logotipo que el backend todavía no
 * tiene. Que persista por su cuenta no le da una card propia: se proyecta dentro
 * del grupo de identidad del formulario, como un campo más al lado de la razón
 * social.
 *
 * El backend devuelve el PNG convertido en la misma respuesta de la carga, así
 * que la vista se refresca con lo que vuelve y no con una segunda petición.
 */
@Component({
  selector: 'app-empresa-logo',
  standalone: true,
  imports: [ErpImageUploadComponent],
  templateUrl: './empresa-logo.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Se proyecta dentro de una fila flex: sin `block`, el host inline no le
  // fijaría el ancho a su contenido.
  host: { class: 'block' },
})
export class EmpresaLogoComponent {
  private readonly logotipoService = inject(EmpresaLogotipoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Base64 crudo del backend (PNG sin el prefijo `data:`). */
  private readonly logotipo = signal<string | null>(null);

  protected readonly loading = signal(true);
  protected readonly isSaving = signal(false);

  /** El `<img>` necesita el prefijo que el backend no manda. */
  protected readonly imageUrl = computed(() => {
    const base64 = this.logotipo();
    return base64 ? `data:image/png;base64,${base64}` : null;
  });

  constructor() {
    this.cargar();
  }

  private cargar(): void {
    this.loading.set(true);
    this.logotipoService
      .obtener()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ logotipo }) => {
          this.logotipo.set(logotipo);
          this.loading.set(false);
        },
        // Sin toast propio: el `errorInterceptor` ya avisó. Se queda en el
        // placeholder, que es también el estado de "todavía no hay logotipo".
        error: () => this.loading.set(false),
      });
  }

  protected onImageSelected(base64: string): void {
    if (this.isSaving()) return;

    const toasts = this.t().empresa.logo.toasts;

    // El recortador promete un data-URL. Si algún día dejara de cumplirlo, el
    // error tiene que verse como el fallo de una subida y no como una excepción
    // suelta que deja el botón girando.
    let archivo: File;
    try {
      archivo = dataUrlToFile(base64, NOMBRE_ARCHIVO);
    } catch {
      this.toast.error(toasts.uploadError.title, toasts.uploadError.desc);
      return;
    }

    this.isSaving.set(true);
    this.logotipoService
      .cargar(archivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ logotipo }) => {
          this.logotipo.set(logotipo);
          this.isSaving.set(false);
          this.toast.success(toasts.uploadSuccess.title, toasts.uploadSuccess.desc);
        },
        error: () => {
          this.isSaving.set(false);
          this.toast.error(toasts.uploadError.title, toasts.uploadError.desc);
        },
      });
  }

  protected onImageRemoved(): void {
    if (this.isSaving()) return;
    this.isSaving.set(true);

    const toasts = this.t().empresa.logo.toasts;
    this.logotipoService
      .quitar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.logotipo.set(null);
          this.isSaving.set(false);
          this.toast.success(toasts.removeSuccess.title, toasts.removeSuccess.desc);
        },
        error: () => {
          this.isSaving.set(false);
          this.toast.error(toasts.removeError.title, toasts.removeError.desc);
        },
      });
  }
}
