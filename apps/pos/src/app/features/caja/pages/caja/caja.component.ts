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
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { ConfiguracionCajaStore } from '../../../configuracion/configuracion-caja.store';
import { CatalogoStore, type CriterioBusqueda } from '../../catalogo/catalogo.store';
import { BuscadorProductosComponent } from '../../catalogo/components/buscador-productos/buscador-productos.component';
import { ProductoCardComponent } from '../../catalogo/components/producto-card/producto-card.component';

/**
 * La caja: donde se vende.
 *
 * Por ahora muestra el catálogo con su buscador y avisa si la caja no está
 * configurada. El carrito (sprint 2) y el cobro (sprint 3) se suman a esta
 * misma página, a la derecha del catálogo.
 */
@Component({
  selector: 'app-caja',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonModule, BuscadorProductosComponent, ProductoCardComponent],
  providers: [CatalogoStore],
  templateUrl: './caja.component.html',
})
export class CajaComponent {
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly tenant = inject(TenantService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly t = this.i18n.t;
  protected readonly catalogo = inject(CatalogoStore);
  protected readonly configuracionCompleta = inject(ConfiguracionCajaStore).completa;

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
  }

  protected onBuscar(criterio: CriterioBusqueda): void {
    this.busquedaActiva.set(criterio.texto.trim() !== '');
    this.catalogo.buscar(criterio);
  }

  protected onAlternarFavorito(id: number): void {
    this.catalogo
      .alternarFavorito(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: () => {
          const fallo = this.t().caja.toasts.favoritoError;
          this.toast.error(fallo.title, fallo.desc);
        },
      });
  }
}
