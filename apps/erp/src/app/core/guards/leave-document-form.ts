import type { AbstractControl, FormGroup } from '@angular/forms';
import { Observable } from 'rxjs';
import type { ConfirmationService } from 'primeng/api';

/**
 * Textos del diálogo de salida. Cada familia de documento trae los suyos del
 * diccionario (`entities.comercialDetalle`, `entities.inventarioDetalle`, …);
 * el `cancel` sale de `common.actions`.
 */
export interface LeaveConfirmLabels {
  readonly leaveHeader: string;
  readonly leaveMessage: string;
  readonly leaveConfirm: string;
}

/**
 * Controles de líneas por default. Se excluyen del chequeo de "sucio" del
 * encabezado: las líneas tienen su propio contador de pendientes, y además
 * quedan marcadas como sucias aun después de persistirse (guardar una línea
 * reemplaza su grupo, pero el array padre conserva la marca).
 *
 * Un documento con más de una tabla en vivo declara las suyas (la factura de
 * compra suma `cuentas`). Un `FormArray` que **no** transacciona aparte —los
 * `pagos` del POS y de las notas, que viajan embebidos en el documento— no va
 * acá: ahí ensuciar sí es un cambio pendiente que se perdería al salir.
 */
const CONTROLES_LINEAS_DEFAULT: readonly string[] = ['detalles'];

/**
 * ¿Tiene el **encabezado** cambios que la persona no guardó? Recorre los
 * controles del form salteando el de líneas.
 *
 * Solo cuenta la edición humana: `patchValue`/`setValue` no ensucian un control,
 * así que hidratar el form en edición o autocompletar un campo (el precio de un
 * ítem, el plazo de pago del cliente) no dispara la advertencia.
 */
export function isHeaderDirty(
  form: FormGroup,
  lineControls: readonly string[] = CONTROLES_LINEAS_DEFAULT,
): boolean {
  return Object.entries(form.controls).some(
    ([name, control]: [string, AbstractControl]) => !lineControls.includes(name) && control.dirty,
  );
}

/**
 * Decide si un formulario de documento puede abandonarse, y si no, lo pregunta.
 *
 * Hay cambios pendientes cuando quedan **líneas sin persistir** o cuando el
 * **encabezado** está sucio: ambos se pierden al salir, así que ambos avisan.
 * Antes solo se miraban las líneas y editar la cabecera y volver perdía el
 * trabajo en silencio.
 *
 * El form que guarda con éxito debe marcarse `markAsPristine()` antes de
 * navegar: guardar también pasa por el guard, y sin eso el camino feliz
 * preguntaría por cambios que ya están almacenados.
 */
export function canLeaveDocumentForm(options: {
  readonly form: FormGroup;
  /** Líneas editadas o nuevas que todavía no viajaron al backend. */
  readonly pendingLines: number;
  readonly confirmation: ConfirmationService;
  readonly labels: LeaveConfirmLabels;
  /** Etiqueta del botón que cancela la salida (`common.actions.cancel`). */
  readonly cancelLabel: string;
  /**
   * Controles cuyas líneas ya cuenta `pendingLines`. Default `['detalles']`; un
   * documento con otra tabla en vivo (la factura de compra) declara las suyas.
   */
  readonly lineControls?: readonly string[];
}): boolean | Observable<boolean> {
  const { form, pendingLines, confirmation, labels, cancelLabel, lineControls } = options;
  if (pendingLines === 0 && !isHeaderDirty(form, lineControls)) return true;

  return new Observable<boolean>((subscriber) => {
    confirmation.confirm({
      header: labels.leaveHeader,
      message: labels.leaveMessage,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: labels.leaveConfirm,
      rejectLabel: cancelLabel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        subscriber.next(true);
        subscriber.complete();
      },
      reject: () => {
        subscriber.next(false);
        subscriber.complete();
      },
    });
  });
}
