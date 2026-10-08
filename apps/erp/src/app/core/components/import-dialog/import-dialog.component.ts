import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { FileDownloadService, I18nService, toHora, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { formatBytes } from '@erp/core/utils/format-bytes';
import type { ExampleConfig, ImportError, ImportMaster } from './import-dialog.types';
import { FileDropzoneComponent } from '../file-dropzone/file-dropzone.component';
import type { ArchivoRechazo } from '../file-dropzone/validar-archivo';
import { FileCardComponent } from '../file-card/file-card.component';

/**
 * Dialog modal de importación de archivos para masters del ERP.
 *
 * **Componente tonto**: no conoce HTTP del dominio ni servicios del master.
 * El consumidor controla todo via inputs/outputs.
 *
 * Responsabilidades propias (lo que sí maneja internamente):
 * - UI del drag & drop con click-to-pick.
 * - Validación local de tipo y tamaño antes de aceptar el archivo.
 * - Descarga del archivo "Ejemplo" reusando `FileDownloadService` de `@reddoc/core`
 *   (cookies HTTP-only y `X-Tenant` ya van por interceptores).
 * - Tab "Maestros": los archivos de referencia que el consumidor declara por
 *   `masters` se ofrecen como descarga directa (son URLs públicas externas, no
 *   pasan por el API — por eso no usan `FileDownloadService`).
 * - Reset del estado al cerrarse (al reabrir vuelve limpio).
 *
 * Lo que delega al consumidor:
 * - HTTP del upload: recibe el `File` por `(importRequested)` y el consumidor
 *   arma `FormData` y postea contra su endpoint específico.
 * - Estado de progreso: el consumidor setea `importing` durante el upload.
 * - Resultados: el consumidor alimenta `errors` (+ `errorSummary`/`errorTotal`)
 *   con lo que responda el backend para poblar el tab "Errores".
 *
 * Ejemplo de uso:
 * ```html
 * <app-import-dialog
 *   [(visible)]="importVisible"
 *   title="Importar contactos"
 *   subtitle="Subí un Excel con los registros a cargar"
 *   [exampleConfig]="{ mode: 'enabled', endpoint: '/general/contacto/plantilla/' }"
 *   [importing]="importLoading()"
 *   [errors]="importErrors()"
 *   [masters]="CONTACTOS_IMPORT_MASTERS"
 *   (importRequested)="onImportRequested($event)"
 * />
 * ```
 */
@Component({
  selector: 'app-import-dialog',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    DialogModule,
    ButtonModule,
    TabsModule,
    TooltipModule,
    FileDropzoneComponent,
    FileCardComponent,
  ],
  templateUrl: './import-dialog.component.html',
  styleUrl: './import-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportDialogComponent {
  // ── API pública ───────────────────────────────────────────────────────────

  /** Control de visibilidad (two-way binding: `[(visible)]`). */
  readonly visible = input<boolean>(false);
  readonly visibleChange = output<boolean>();

  /** Título del header (ej. "Importar contactos"). */
  readonly title = input.required<string>();

  /** Subtítulo del header. Opcional. */
  readonly subtitle = input<string>('');

  /**
   * Extensiones aceptadas en formato del atributo `accept` (ej. `.xlsx,.xls`).
   * Default: Excel (.xlsx, .xls).
   */
  readonly accept = input<string>('.xlsx,.xls');

  /** Tamaño máximo del archivo en MB. Default: 10. */
  readonly maxSizeMB = input<number>(10);

  /**
   * Configuración del botón "Descargar ejemplo". Ver `ExampleConfig`.
   * `null` = oculto. `mode: 'enabled'` = funcional. `mode: 'disabled'` = bloqueado.
   */
  readonly exampleConfig = input<ExampleConfig | null>(null);

  /** Indicador de upload en curso. El padre lo setea durante la importación. */
  readonly importing = input<boolean>(false);

  /** Errores reportados por el backend (ya capados a 100); alimentan el tab "Errores". */
  readonly errors = input<readonly ImportError[]>([]);

  /**
   * Advertencia sobre lo que la importación va a hacer, mostrada antes de subir.
   * Vacío ⇒ no se pinta. La usan las importaciones cuyo efecto no es obvio —las
   * que **reemplazan** lo que hay en pantalla, o las que **suman** a lo que ya
   * está guardado—; el consumidor decide cuándo mostrarla, para que no se vuelva
   * un cartel permanente que nadie lee.
   */
  readonly notice = input<string>('');

  /** Mensaje resumen del error (el `detail` del backend); se muestra como banner. */
  readonly errorSummary = input<string>('');

  /** Total real de errores; si supera a los mostrados se indica el truncado. */
  readonly errorTotal = input<number>(0);

  /**
   * Maestros del listado: archivos de referencia descargables que alimentan el
   * tab "Maestros". Cada lista declara los suyos con `IMPORT_MASTER.*`
   * (ver `import-masters.constant.ts`); vacío ⇒ el tab muestra su empty state.
   */
  readonly masters = input<readonly ImportMaster[]>([]);

  /** Emitido cuando el usuario hace click en "Importar" con un archivo válido. */
  readonly importRequested = output<File>();

  // ── Colaboradores ─────────────────────────────────────────────────────────

  private readonly fileDownload = inject(FileDownloadService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  // ── Estado interno ────────────────────────────────────────────────────────

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly uploadedAt = signal<string>('');
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly exampleDownloading = signal(false);
  /**
   * Tab visible. Arranca en errores y el reset de cierre lo recalcula: con
   * maestros declarados, la primera apertura muestra "Maestros" (ver constructor).
   */
  protected readonly activeTab = signal<'errors' | 'masters'>('errors');

  // ── Derivados ─────────────────────────────────────────────────────────────

  /** Botón "Importar" disponible solo con archivo válido y sin upload en curso. */
  protected readonly canSubmit = computed(() => this.selectedFile() !== null && !this.importing());

  /** Hay más errores de los que se muestran (lista capada). */
  protected readonly errorTruncated = computed(() => this.errorTotal() > this.errors().length);

  protected readonly exampleVisible = computed(() => this.exampleConfig() !== null);

  /**
   * El tab "Maestros" existe solo si hay maestros que ofrecer. Una importación
   * de líneas nunca los tiene, y una pestaña que siempre lleva a un vacío
   * promete algo que no llega. Sin ella queda un solo panel, y un tab solitario
   * es chrome sin función: los errores se muestran sin pestañera.
   */
  protected readonly mastersVisible = computed(() => this.masters().length > 0);

  protected readonly exampleEnabled = computed(() => {
    const cfg = this.exampleConfig();
    return cfg !== null && cfg.mode === 'enabled' && !this.exampleDownloading();
  });

  protected readonly exampleDisabledReason = computed(() => {
    const cfg = this.exampleConfig();
    return cfg !== null && cfg.mode === 'disabled' ? cfg.reason : null;
  });

  /** Hint del dropzone con tipos y tamaño máximo (reemplaza placeholders i18n). */
  protected readonly hintText = computed(() => {
    return this.t()
      .common.import.dropzone.hint.replace('{types}', this.accept())
      .replace('{max}', String(this.maxSizeMB()));
  });

  /** Meta del archivo cargado: "1.2 MB · cargado hoy 14:32". */
  protected readonly fileMetaText = computed(() => {
    const f = this.selectedFile();
    if (!f) return '';
    return this.t()
      .common.import.fileMeta.uploadedAt.replace('{size}', formatBytes(f.size))
      .replace('{time}', this.uploadedAt());
  });

  constructor() {
    // Al cerrar (visible → false) reseteamos para que la próxima apertura
    // siempre sea estado limpio: sin archivo previo, sin error visible.
    effect(() => {
      if (!this.visible()) {
        this.selectedFile.set(null);
        this.uploadedAt.set('');
        this.errorMessage.set(null);
        // Antes de importar, lo útil son los maestros (qué códigos escribir); los
        // errores todavía no existen. Si el listado no declara maestros, el tab de
        // errores es el único con contenido posible.
        this.activeTab.set(this.mastersVisible() ? 'masters' : 'errors');
      }
    });

    // Al llegar errores, asegurar que el tab "Errores" quede visible (por si el
    // usuario estaba en "Maestros").
    effect(() => {
      if (this.errors().length > 0) this.activeTab.set('errors');
    });
  }

  // ── API protegida (template) ──────────────────────────────────────────────

  protected onVisibleChange(value: boolean): void {
    this.visibleChange.emit(value);
  }

  protected onCancel(): void {
    if (this.importing()) return;
    this.visibleChange.emit(false);
  }

  protected clearSelectedFile(): void {
    if (this.importing()) return;
    this.selectedFile.set(null);
    this.uploadedAt.set('');
    this.errorMessage.set(null);
  }

  protected onSubmit(): void {
    const file = this.selectedFile();
    if (!file || this.importing()) return;
    this.importRequested.emit(file);
  }

  protected onDownloadExample(): void {
    const cfg = this.exampleConfig();
    if (cfg === null || cfg.mode !== 'enabled' || this.exampleDownloading()) return;

    this.exampleDownloading.set(true);
    this.fileDownload
      .download(cfg.endpoint, {
        fallbackFilename: cfg.filename ?? 'ejemplo.xlsx',
        params: cfg.params,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.exampleDownloading.set(false),
        error: () => {
          this.exampleDownloading.set(false);
          const err = this.t().common.import.example.error;
          this.toast.error(err.title, err.desc);
        },
      });
  }

  // ── Internos ──────────────────────────────────────────────────────────────

  /** Archivo válido (lo validó la dropzone): reemplaza la dropzone por la file-card. */
  protected onFileSelected(file: File): void {
    this.errorMessage.set(null);
    this.selectedFile.set(file);
    this.uploadedAt.set(toHora(new Date()));
  }

  protected onFileRejected(motivo: ArchivoRechazo): void {
    const dict = this.t().common.import.dropzone;
    this.errorMessage.set(motivo === 'tipo' ? dict.invalidType : dict.tooLarge);
  }
}
