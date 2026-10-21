import { DestroyRef, type Type, inject } from '@angular/core';
import { DialogService, type DynamicDialogRef } from 'primeng/dynamicdialog';
import { EMPTY, type Observable, catchError, filter, finalize, from, switchMap, take } from 'rxjs';
import { I18nService, ToastService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';

/** Lo que varía entre un alta inline y otra. */
export interface AbrirFormModalOptions {
  /** `data` del `DynamicDialogConfig`, que el form lee con `inject(DynamicDialogConfig)`. */
  readonly data?: unknown;
  /** Ancho del modal; por defecto el de un master de dos columnas. */
  readonly width?: string;
}

/** Abre un formulario de master en un modal y emite lo que guardó. */
export interface FormModal {
  /**
   * Carga lazy el formulario, lo abre y emite **una vez** lo que el form
   * devuelva al cerrar con éxito (`dialogRef.close(saved)`). Cancelar o cerrar
   * con `null` completa sin emitir.
   */
  abrir<T>(cargar: () => Promise<Type<unknown>>, options?: AbrirFormModalOptions): Observable<T>;
}

/**
 * Alta inline de un master desde otra pantalla («Crear tercero», «Crear ítem»):
 * el form se abre en un modal y lo creado vuelve a quien lo pidió.
 *
 * Reúne lo que cada alta inline necesita y es fácil olvidar:
 *
 * - **Sin descartes accidentales:** ni el clic afuera ni `Escape` cierran el
 *   modal; un form a medias solo se abandona con Cancelar o la ✕.
 * - **Foco:** se apaga el autofoco de PrimeNG, que caería en la ✕ (el primer
 *   focusable). El form lo resuelve con `prepararFormModal`.
 * - **Sin modales huérfanos:** si quien lo abrió se destruye con el modal
 *   abierto (p. ej. la sesión vence y se navega al login), el modal se cierra
 *   con él; si no, un guardado ahí crearía algo que nadie selecciona.
 * - **Chunk caído:** si el form no carga, se avisa con un toast y el observable
 *   completa, así el siguiente intento vuelve a funcionar.
 *
 * Se llama en un **field initializer** (usa `inject`):
 *
 * ```ts
 * private readonly formModal = formModal();
 * this.formModal.abrir<Item>(() => import('…/item-form.component').then((m) => m.ItemFormComponent));
 * ```
 */
export function formModal(): FormModal {
  const dialog = inject(DialogService);
  const toast = inject(ToastService);
  const i18n = inject<I18nService<AppDict>>(I18nService);
  const abiertos = new Set<DynamicDialogRef>();
  inject(DestroyRef).onDestroy(() => abiertos.forEach((ref) => ref.close(null)));

  return {
    abrir<T>(cargar: () => Promise<Type<unknown>>, options: AbrirFormModalOptions = {}) {
      return from(cargar()).pipe(
        switchMap((component) => {
          const ref = dialog.open(component, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            dismissableMask: false,
            closeOnEscape: false,
            focusOnShow: false,
            width: options.width ?? 'min(70rem, 95vw)',
            contentStyle: { 'max-height': '86vh', overflow: 'auto' },
            data: options.data,
          });
          // `DialogService` devuelve `null` si ese componente ya está abierto.
          if (!ref) return EMPTY;
          abiertos.add(ref);
          // `take(1)`: PrimeNG completa `onClose` un segundo después de cerrar, y
          // quien encadene con `exhaustMap` ignoraría mientras tanto otro pedido.
          return ref.onClose.pipe(
            take(1),
            finalize(() => abiertos.delete(ref)),
            filter((saved: unknown): saved is T => saved != null),
          );
        }),
        catchError(() => {
          const { title, desc } = i18n.t().common.toasts.formModalError;
          toast.error(title, desc);
          return EMPTY;
        }),
      );
    },
  };
}

/**
 * Lado del form: accesibilidad del modal, a llamar en `afterNextRender` cuando
 * el form se abrió como modal.
 *
 * Con `showHeader: false` PrimeNG deja el `role="dialog"` sin nombre: se enlaza
 * el título propio del form (`titleId`). Y como `formModal` apaga el autofoco,
 * el foco va al primer campo (`primerCampo`, un selector CSS).
 */
export function prepararFormModal(host: HTMLElement, titleId: string, primerCampo: string): void {
  host.closest('[role="dialog"]')?.setAttribute('aria-labelledby', titleId);
  host.querySelector<HTMLElement>(primerCampo)?.focus();
}
