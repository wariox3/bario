import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { ConfiguracionCajaStore } from '../../../configuracion/configuracion-caja.store';
import { CatalogoStore, type CriterioBusqueda } from '../../catalogo/catalogo.store';
import type { ProductoCatalogo } from '../../catalogo/producto-catalogo.model';
import { BuscadorProductosComponent } from '../../catalogo/components/buscador-productos/buscador-productos.component';
import { ProductoCardComponent } from '../../catalogo/components/producto-card/producto-card.component';
import { CarritosStore, type ResultadoAgregar } from '../../carrito/carritos.store';
import { ConsumidorFinalService } from '../../carrito/consumidor-final.service';
import { CarritoPanelComponent } from '../../carrito/components/carrito-panel/carrito-panel.component';
import { CarritoTabsComponent } from '../../carrito/components/carrito-tabs/carrito-tabs.component';

/**
 * La caja: donde se vende. Catálogo a la izquierda, venta activa a la derecha y
 * las ventas abiertas en pestañas arriba.
 *
 * Tocar una tarjeta suma una unidad a la venta activa; el lector de barras
 * (modo código + Enter) hace lo mismo si el código corresponde a un solo
 * producto.
 */
@Component({
  selector: 'app-caja',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-0 flex-1 flex-col' },
  imports: [
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    BuscadorProductosComponent,
    ProductoCardComponent,
    CarritoPanelComponent,
    CarritoTabsComponent,
  ],
  providers: [CatalogoStore, ConfirmationService],
  templateUrl: './caja.component.html',
})
export class CajaComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly carritos = inject(CarritosStore);

  protected readonly t = this.i18n.t;
  protected readonly catalogo = inject(CatalogoStore);
  protected readonly configuracionCompleta = inject(ConfiguracionCajaStore).completa;
  protected readonly cantidades = this.carritos.cantidades;

  /** Hubo búsqueda: el vacío se explica distinto que un catálogo sin productos. */
  private readonly busquedaActiva = signal(false);
  protected readonly vacioPorBusqueda = computed(
    () => this.catalogo.productos().length === 0 && this.busquedaActiva(),
  );

  protected readonly rutaConfiguracion = computed(
    () => `/t/${this.tenant.currentSlug() ?? ''}/configuracion`,
  );

  constructor() {
    this.catalogo.buscar({ modo: 'nombre', texto: '' });
    inject(ConsumidorFinalService)
      .resolver()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contacto) => this.carritos.usarContactoPorDefecto(contacto));
  }

  protected onBuscar(criterio: CriterioBusqueda): void {
    const texto = criterio.texto.trim();
    this.busquedaActiva.set(texto !== '');
    if (criterio.modo === 'codigo' && texto) {
      this.catalogo
        .buscarCodigo(texto)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((producto) => {
          if (producto) this.onAgregar(producto);
          else this.avisar('codigoNoEncontrado', 'warn');
        });
      return;
    }
    this.catalogo.buscar(criterio);
  }

  protected onAgregar(producto: ProductoCatalogo): void {
    this.carritos
      .agregarProducto(producto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultado) => this.informar(resultado));
  }

  protected onAlternarFavorito(id: number): void {
    this.catalogo
      .alternarFavorito(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => this.avisar('favoritoError', 'error') });
  }

  private informar(resultado: ResultadoAgregar): void {
    if (resultado === 'sinStock') this.avisar('sinStock', 'warn');
    else if (resultado === 'bloqueada') this.avisar('ventaBloqueada', 'warn');
    else if (resultado === 'error') this.avisar('agregarError', 'error');
  }

  private avisar(clave: keyof AppDict['caja']['toasts'], severidad: 'warn' | 'error'): void {
    const tx = this.t().caja.toasts[clave];
    if (severidad === 'warn') this.toast.warn(tx.title, tx.desc);
    else this.toast.error(tx.title, tx.desc);
  }
}
