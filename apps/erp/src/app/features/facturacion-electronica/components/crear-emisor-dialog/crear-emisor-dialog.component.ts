import { Component, inject, input, model, output } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { EmpresaConfigFormValue } from '@erp/features/configuracion/configuracion.mapper';

/**
 * Confirmación del alta de la empresa como emisor.
 *
 * Tonto: recibe qué se va a registrar y avisa cuando el usuario acepta. No pide
 * nada ni sabe de HTTP.
 *
 * Muestra la razón social y el número de identificación **a propósito**: es el
 * último momento en que esos datos se pueden corregir, así que la confirmación
 * tiene que dejar verlos, no solo preguntar "¿estás seguro?".
 */
@Component({
  selector: 'app-crear-emisor-dialog',
  standalone: true,
  imports: [DialogModule, ButtonModule],
  templateUrl: './crear-emisor-dialog.component.html',
})
export class CrearEmisorDialogComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  readonly visible = model.required<boolean>();

  /** Lo que se acaba de guardar y está por registrarse. */
  readonly datos = input<EmpresaConfigFormValue | null>(null);

  /** Alta en vuelo: bloquea el cierre y pone el botón en carga. */
  readonly processing = input(false);

  readonly confirmar = output<void>();

  /**
   * Cierre pedido por el p-dialog (X, máscara o Escape).
   *
   * El guard existe por Escape: el listener del p-dialog queda vinculado desde
   * la apertura y poner `closable` en falso después no lo desactiva, así que
   * sin esto la tecla cerraba el modal con el alta en vuelo — que seguía
   * corriendo sin que nada lo contara.
   */
  protected onVisibleChange(visible: boolean): void {
    if (this.processing() && !visible) return;
    this.visible.set(visible);
  }

  /** Identificación completa (`número-DV`), armada acá y no en el template. */
  protected identificacion(): string {
    const datos = this.datos();
    if (!datos) return '—';
    const dv = datos.digito_verificacion?.trim();
    return dv ? `${datos.numero_identificacion}-${dv}` : datos.numero_identificacion;
  }
}
