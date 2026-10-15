import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DrawerModule } from 'primeng/drawer';
import {
  I18nService,
  MODELO,
  ModelPermissionsService,
  TenantService,
  ToastService,
  formatCop,
  type Item,
} from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { ConfiguracionCajaStore } from '../../../configuracion/configuracion-caja.store';
import { CatalogoStore, type CriterioBusqueda } from '../../catalogo/catalogo.store';
import type { ProductoCatalogo } from '../../catalogo/producto-catalogo.model';
import { BuscadorProductosComponent } from '../../catalogo/components/buscador-productos/buscador-productos.component';
import { ProductoCardComponent } from '../../catalogo/components/producto-card/producto-card.component';
import { itemToProductoCatalogo } from '../../catalogo/producto-catalogo.mapper';
import { ItemRapidoDialogComponent } from '../../item-rapido/components/item-rapido-dialog/item-rapido-dialog.component';
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
  host: {
    class: 'flex min-h-0 flex-1 flex-col',
    '(document:keydown)': 'onTecla($event)',
  },
  imports: [
    RouterLink,
    ButtonModule,
    ConfirmDialogModule,
    DrawerModule,
    BuscadorProductosComponent,
    ProductoCardComponent,
    CarritoPanelComponent,
    CarritoTabsComponent,
    ItemRapidoDialogComponent,
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
  private readonly configuracionCaja = inject(ConfiguracionCajaStore);
  protected readonly configuracionCompleta = this.configuracionCaja.completa;
  /** Lectura del tipo de documento de la empresa: mientras carga no se avisa nada. */
  protected readonly estadoTipo = this.configuracionCaja.estadoTipo;
  protected readonly cantidades = this.carritos.cantidades;

  /** Hubo búsqueda: el vacío se explica distinto que un catálogo sin productos. */
  private readonly busquedaActiva = signal(false);
  protected readonly vacioPorBusqueda = computed(
    () => this.catalogo.productos().length === 0 && this.busquedaActiva(),
  );

  protected readonly rutaConfiguracion = computed(
    () => `/t/${this.tenant.currentSlug() ?? ''}/configuracion`,
  );

  /**
   * Permisos del usuario sobre ítems y contactos: deciden si se ofrecen el ítem
   * rápido, la estrella de favorito y el cliente rápido. Mientras no llegan (o
   * si la consulta falla) se permite; el backend responde 403 si corresponde.
   */
  private readonly permisos = inject(ModelPermissionsService);
  protected readonly puedeCrearItem = computed(() =>
    this.permisos.allows(MODELO.general.item, 'crear'),
  );
  protected readonly puedeFavorito = computed(() =>
    this.permisos.allows(MODELO.general.item, 'editar'),
  );

  /**
   * Pantalla angosta (tablet, móvil): el catálogo ocupa todo y la venta pasa a
   * un drawer que se abre desde la barra inferior.
   */
  protected readonly compacta = signal(false);
  protected readonly ventaVisible = signal(false);
  protected readonly cantidadVenta = this.carritos.cantidadTotal;
  protected readonly totalVenta = computed(() => formatCop(this.carritos.resumen().total));

  private readonly buscador = viewChild(BuscadorProductosComponent);
  private readonly panel = viewChild(CarritoPanelComponent);

  constructor() {
    const consulta = window.matchMedia(CONSULTA_COMPACTA);
    const alCambiar = (e: MediaQueryListEvent | MediaQueryList): void =>
      this.compacta.set(e.matches);
    alCambiar(consulta);
    consulta.addEventListener('change', alCambiar);
    this.destroyRef.onDestroy(() => consulta.removeEventListener('change', alCambiar));

    for (const modelo of [MODELO.general.item, MODELO.general.contacto]) {
      this.permisos.load(modelo).pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }
    this.catalogo.buscar({ modo: 'nombre', texto: '' });
    inject(ConsumidorFinalService)
      .resolver()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contacto) => this.carritos.usarContactoPorDefecto(contacto));
  }

  /**
   * Atajos de la caja: F2 cobra, F4 abre una venta nueva, F3 o «/» llevan al
   * buscador. Además, si se teclea sin ningún campo con foco (el lector de
   * barras dispara teclas donde esté el foco), el foco salta al buscador antes
   * de que llegue la tecla, para no perder la lectura. Con un modal abierto no
   * se intercepta nada: el modal manda.
   */
  protected onTecla(event: KeyboardEvent): void {
    if (event.defaultPrevented || hayModalAbierto()) return;
    switch (event.key) {
      case 'F2':
        event.preventDefault();
        // En pantalla angosta el panel vive en el drawer: primero se abre.
        if (this.compacta() && !this.ventaVisible()) this.ventaVisible.set(true);
        else this.panel()?.cobrar();
        return;
      case 'F4':
        event.preventDefault();
        this.carritos.nueva();
        this.buscador()?.enfocar();
        return;
      case 'F3':
        event.preventDefault();
        this.buscador()?.enfocar();
        return;
    }
    if (escribiendoEnCampo(event.target)) return;
    if (event.key === '/') {
      event.preventDefault();
      this.buscador()?.enfocar();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.buscador()?.enfocar();
    }
  }

  protected recargarTipo(): void {
    this.configuracionCaja.recargarTipo();
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

  /** Alta rápida de ítem; con código, viene de una búsqueda por código sin resultado. */
  protected readonly creandoItem = signal(false);
  protected readonly codigoNuevoItem = signal('');

  protected onNuevoItem(codigo: string): void {
    this.codigoNuevoItem.set(codigo);
    this.creandoItem.set(true);
  }

  /**
   * Ítem recién creado: el catálogo se refresca y, si se creó a partir de un
   * código que no existía, entra a la venta como si se hubiera leído.
   */
  protected onItemCreado(item: Item): void {
    this.catalogo.recargar();
    if (this.codigoNuevoItem()) this.onAgregar(itemToProductoCatalogo(item));
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

/** Por debajo de `lg` (1024px) la venta pasa al drawer. */
const CONSULTA_COMPACTA = '(max-width: 1023.98px)';

/** Hay un diálogo modal de PrimeNG abierto (cobro, edición, confirmación…). */
function hayModalAbierto(): boolean {
  return document.querySelector('.p-dialog-mask') !== null;
}

/** El foco está en algo que recibe texto: ahí las teclas son de la persona. */
function escribiendoEnCampo(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
