import { Component, inject, signal } from '@angular/core';
import { TabsModule } from 'primeng/tabs';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { VentaFormatoConfigComponent } from '../venta-formato-config/venta-formato-config.component';
import { VentaAiuConfigComponent } from '../venta-aiu-config/venta-aiu-config.component';

/**
 * Área "Venta" de la configuración, en dos sub-pestañas como el ERP anterior:
 * **Formato** (los textos de la factura impresa) y **AIU** (los ítems de
 * administración, imprevisto y utilidad).
 *
 * Cada sub-pestaña es auto-contenida: lee y guarda solo sus campos.
 */
@Component({
  selector: 'app-venta-config',
  standalone: true,
  imports: [TabsModule, VentaFormatoConfigComponent, VentaAiuConfigComponent],
  templateUrl: './venta-config.component.html',
})
export class VentaConfigComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  protected readonly t = this.i18n.t;

  protected readonly subseccion = signal<'formato' | 'aiu'>('formato');
}
