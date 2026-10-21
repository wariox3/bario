import { DOCUMENT, DestroyRef, Directive, type OnInit, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfirmationService } from 'primeng/api';
import { fromEvent, merge } from 'rxjs';

/** El `<button>` del aceptar: la clase va en el host `p-button` o en el propio botón. */
const SELECTOR_ACEPTAR =
  '.p-confirmdialog-accept-button button, button.p-confirmdialog-accept-button';

/**
 * Hace que Enter confirme en un `<p-confirmdialog>` cuando la confirmación lo pide
 * con `acceptButtonProps: { autofocus: true }`: al abrirse, el foco cae en el botón
 * de aceptar y Enter lo pulsa.
 *
 * ```html
 * <p-confirmdialog libAceptarConEnter />
 * ```
 *
 * PrimeNG 20 lo promete y no lo cumple: su `defaultFocus` quedó sin usar y el
 * `p-dialog` interno enfoca el primer botón del pie —Cancelar— 150 ms después de
 * abrir, pisando el `autofocus` del de aceptar. Sin esta directiva Enter cancela.
 * Tampoco se puede apagar ese foco: `ConfirmDialog` no expone su `p-dialog` (el
 * campo `dialog` existe pero nunca se asigna).
 *
 * Así que se corrige el resultado: desde que llega la confirmación y hasta que la
 * persona toca algo —tecla o puntero—, todo foco que entre al diálogo se lleva al
 * aceptar. Tab, Escape o un clic devuelven el control de inmediato. Las acciones
 * irreversibles no lo piden, para que un Enter de más no las dispare.
 *
 * No inyecta `ConfirmDialog`: este archivo sale por el barrel de `@reddoc/ui`, que
 * algunas apps cargan eager, y traer `primeng/confirmdialog` como valor lo metería
 * en su bundle inicial. El `key` se lee como
 * input propio, el mismo que recibe el diálogo.
 */
@Directive({
  selector: 'p-confirmdialog[libAceptarConEnter], p-confirmDialog[libAceptarConEnter]',
  standalone: true,
})
export class AceptarConEnterDirective implements OnInit {
  private readonly confirmation = inject(ConfirmationService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  /** El `key` del `<p-confirmdialog>`: solo se atienden sus confirmaciones. */
  readonly key = input<string>();

  /** Hay una confirmación con Enter abierta y la persona aún no tocó nada. */
  private armado = false;

  ngOnInit(): void {
    this.confirmation.requireConfirmation$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => {
        const props: { readonly autofocus?: boolean } | undefined = c?.acceptButtonProps;
        this.armado = c?.key === this.key() && props?.autofocus === true;
      });

    // En captura: el keydown que abrió el diálogo ya pasó por aquí antes de armarlo.
    merge(
      fromEvent(this.document, 'keydown', { capture: true }),
      fromEvent(this.document, 'pointerdown', { capture: true }),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => (this.armado = false));

    fromEvent<FocusEvent>(this.document, 'focusin', { capture: true })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (!this.armado || !(event.target instanceof HTMLElement)) return;
        const aceptar = event.target
          .closest('.p-confirmdialog')
          ?.querySelector<HTMLButtonElement>(SELECTOR_ACEPTAR);
        if (aceptar && aceptar !== event.target) aceptar.focus();
      });
  }
}
