import { DestroyRef, type Signal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { finalize } from 'rxjs';
import { I18nService, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { ImportError, ImportMaster } from './import-dialog.types';
import { parseImportErrors } from './import-dialog.utils';

/** Lo que la pantalla declara para importar: cómo sube y qué hacer al terminar. */
export interface ImportStateConfig {
  /**
   * Sube el archivo. Casi siempre `(file) => this.service.importar(file)`; los
   * flujos con contexto agregan lo suyo: `(file) => this.service.importarSoporte(id(), file)`.
   */
  readonly upload: (file: File) => Observable<unknown>;
  /** Refrescar lo que la importación cambió. Se llama solo tras un éxito real. */
  readonly onImported: () => void;
  /** Archivos de referencia del tab "Maestros". Ver `IMPORT_MASTER`. */
  readonly masters?: readonly ImportMaster[];
}

/** Lo que la pantalla le pasa a `<app-import-dialog>` y usa desde su toolbar. */
export interface ImportState {
  readonly visible: Signal<boolean>;
  readonly loading: Signal<boolean>;
  readonly errors: Signal<readonly ImportError[]>;
  readonly errorSummary: Signal<string>;
  readonly errorTotal: Signal<number>;
  readonly masters: readonly ImportMaster[];
  /** Abre el diálogo descartando el resultado del intento anterior. */
  open(): void;
  /** Two-way del `visible` del diálogo. */
  setVisible(value: boolean): void;
  /** Corre la importación con el archivo que eligió el usuario. */
  submit(file: File): void;
}

/**
 * Estado del diálogo de importación de una pantalla.
 *
 * Las seis pantallas que importan repetían el mismo bloque —cinco signals, tres
 * handlers y el matiz de que los errores de validación pueden llegar con 200 o
 * con 4xx—, y ese matiz es justo el que se pierde al copiar y pegar. Acá se
 * declara una vez:
 *
 * ```ts
 * protected readonly importar = importState({
 *   upload: (file) => this.service.importar(file),
 *   onImported: () => this.loadList(),
 *   masters: CONTACTOS_IMPORT_MASTERS,
 * });
 * ```
 *
 * ```html
 * <app-import-dialog
 *   [visible]="importar.visible()"
 *   (visibleChange)="importar.setVisible($event)"
 *   [importing]="importar.loading()"
 *   [errors]="importar.errors()"
 *   [errorSummary]="importar.errorSummary()"
 *   [errorTotal]="importar.errorTotal()"
 *   [masters]="importar.masters"
 *   (importRequested)="importar.submit($event)"
 * />
 * ```
 *
 * Se llama en un **field initializer** del componente: usa `inject`, y el
 * `upload` se evalúa recién al importar, así que puede leer campos declarados
 * después.
 *
 * Lo que NO hace: el título, el subtítulo y la plantilla de ejemplo siguen
 * siendo del consumidor — son texto y endpoint de su dominio.
 */
export function importState(config: ImportStateConfig): ImportState {
  const toast = inject(ToastService);
  const destroyRef = inject(DestroyRef);
  const i18n = inject<I18nService<AppDict>>(I18nService);

  const visible = signal(false);
  const loading = signal(false);
  const errors = signal<readonly ImportError[]>([]);
  const errorSummary = signal('');
  const errorTotal = signal(0);

  /** Descarta el resultado del intento anterior. */
  const clear = (): void => {
    errors.set([]);
    errorSummary.set('');
    errorTotal.set(0);
  };

  /**
   * Vuelca los errores parseados en los signals del diálogo. Devuelve `true` si
   * había algo que mostrar, para que el llamador no siga el camino de éxito.
   */
  const apply = (parsed: ReturnType<typeof parseImportErrors>): boolean => {
    if (parsed.errors.length === 0 && !parsed.summary) return false;
    errors.set(parsed.errors);
    errorSummary.set(parsed.summary);
    errorTotal.set(parsed.total);
    return true;
  };

  return {
    visible,
    loading,
    errors,
    errorSummary,
    errorTotal,
    masters: config.masters ?? [],

    open: () => {
      clear();
      visible.set(true);
    },

    setVisible: (value: boolean) => visible.set(value),

    submit: (file: File) => {
      if (loading()) return;
      loading.set(true);
      clear();
      config
        .upload(file)
        .pipe(
          takeUntilDestroyed(destroyRef),
          finalize(() => loading.set(false)),
        )
        .subscribe({
          next: (result) => {
            // El backend puede reportar los errores de validación en un 200
            // ("No se procesó ningún registro"); si los trae, se muestran en vez
            // de tratarlo como éxito.
            if (apply(parseImportErrors(result))) return;
            const toasts = i18n.t().common.import.toasts;
            toast.success(toasts.success.title, toasts.success.desc);
            visible.set(false);
            clear();
            config.onImported();
          },
          error: (err: HttpErrorResponse) => {
            // Los mismos errores, ahora con 4xx. Sin estructura reconocible
            // (red, 502 con HTML) → toast genérico.
            if (!apply(parseImportErrors(err.error))) {
              const toasts = i18n.t().common.import.toasts;
              toast.error(toasts.error.title, toasts.error.desc);
            }
          },
        });
    },
  };
}
