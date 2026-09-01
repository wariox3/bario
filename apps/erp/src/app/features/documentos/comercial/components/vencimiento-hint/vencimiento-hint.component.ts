import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { formatFechaCorta, I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';

/**
 * Nota bajo el campo de vencimiento: cuenta **de dónde salió la fecha**.
 *
 * Un vencimiento no es un dato que la persona invente: lo dicta el plazo pactado
 * con el contacto. Pero la factura que está digitando llega con su propia fecha
 * impresa y puede no coincidir —el papel manda—, así que el campo queda editable
 * y esta nota es la que hace visible la relación:
 *
 * - **En reposo** (coincide con el plazo) dice cuántos días aporta el plazo. Es
 *   la prueba en pantalla de que el plazo del contacto entró y calculó; sin ella
 *   el autocálculo es invisible y se lee como que no funcionó.
 * - **Desviada** (editada a mano, o un documento viejo cuyo plazo cambió) se
 *   pone ámbar, dice de cuánto es la diferencia y ofrece volver al calculado.
 *
 * Ámbar y no rojo, y sin invalidar el formulario: apartarse del plazo es una
 * excepción legítima del negocio, no un error. Lo imposible —vencer antes de
 * emitir— es la regla dura, y esa sí viaja por `lib-field-error`.
 *
 * Tonto: recibe el estado que expone `setupVencimientoAutocompute` y emite el
 * pedido de restablecer. No conoce el formulario ni el control.
 */
@Component({
  selector: 'app-vencimiento-hint',
  standalone: true,
  host: { '[style.display]': "vacio() ? 'none' : null" },
  templateUrl: './vencimiento-hint.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VencimientoHintComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  /** Días que aporta el plazo elegido (0 = contado); `null` si no se conocen. */
  readonly dias = input<number | null>(null);

  /** Vencimiento que dicta el plazo, para nombrarlo en la acción de restablecer. */
  readonly sugerido = input<Date | null>(null);

  /** Diferencia en días contra el sugerido: 0 coincide, ± se apartó. */
  readonly desvio = input<number | null>(null);

  /**
   * Calla la nota mientras el campo muestra un error propio (requerido, o
   * anterior a la emisión): ese mensaje manda y dos líneas competirían.
   */
  readonly silenciar = input(false);

  protected readonly restablecer = output<void>();

  /** Se apartó del plazo: hay con qué comparar y no coincide. */
  protected readonly desviado = computed(() => {
    const desvio = this.desvio();
    return desvio != null && desvio !== 0;
  });

  /** Nada que contar: sin días del plazo no hay origen que explicar. */
  readonly vacio = computed(() => this.silenciar() || this.dias() == null);

  /** `+5` → "5 días más que el plazo (30 d)"; `-5` → "…menos…". */
  protected readonly mensajeDesvio = computed(() => {
    const desvio = this.desvio() ?? 0;
    const dict = this.t().entities.vencimiento.desvio;
    const abs = Math.abs(desvio);
    const plural = desvio > 0 ? dict.mas : dict.menos;
    return (abs === 1 ? plural.one : plural.other.replace('{n}', String(abs))).replace(
      '{dias}',
      String(this.dias() ?? 0),
    );
  });

  /** "Usar 15/09/2026" — la acción nombra la fecha a la que vuelve. */
  protected readonly etiquetaRestablecer = computed(() =>
    this.t().entities.vencimiento.usar.replace('{fecha}', formatFechaCorta(this.sugerido())),
  );
}
