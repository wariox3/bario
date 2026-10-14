import { Injectable, computed, inject, linkedSignal } from '@angular/core';
import { type Observable, catchError, forkJoin, map, of, tap } from 'rxjs';
import {
  I18nService,
  ItemService,
  PrecioDetalleService,
  TenantService,
  precioListaDeContacto,
  type ErpSelectOption,
  type Item,
} from '@reddoc/core';
import type { AppDict } from '@pos/i18n';
import { PosStorageService } from '../../../core/storage/pos-storage.service';
import { ConfiguracionCajaStore } from '../../configuracion/configuracion-caja.store';
import type { ProductoCatalogo } from '../catalogo/producto-catalogo.model';
import type { Carrito, EstadoCarritos } from './carrito.model';
import {
  agregarLinea,
  buscarLinea,
  cabeEnStock,
  cantidadTotal,
  conCantidad,
  contactoParaGuardar,
  crearCarrito,
  editarLinea,
  esEstadoCarritos,
  estadoInicial,
  lineaDesdeProducto,
  recotizar,
  resumenCarrito,
  retirarLinea,
  siguienteNumero,
} from './carrito.ops';

/** Cómo terminó un intento de sumar unidades a la venta. */
export type ResultadoAgregar = 'agregado' | 'sinStock' | 'error';

/**
 * Las ventas abiertas de la caja (una por pestaña), persistidas en el
 * dispositivo por tenant: recargar la página o cambiar de sección no las pierde.
 *
 * Las mutaciones son las operaciones puras de `carrito.ops`; este store las
 * aplica, guarda el resultado y resuelve lo que necesita red (el detalle del
 * ítem con sus impuestos y el precio en la lista del cliente).
 */
@Injectable({ providedIn: 'root' })
export class CarritosStore {
  private readonly tenant = inject(TenantService);
  private readonly storage = inject(PosStorageService);
  private readonly itemService = inject(ItemService);
  private readonly precioDetalle = inject(PrecioDetalleService);
  private readonly configuracion = inject(ConfiguracionCajaStore);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  private readonly slug = this.tenant.currentSlug;
  private readonly clave = computed(() => {
    const slug = this.slug();
    return slug ? `pos:carritos:${slug}` : null;
  });

  private readonly estado = linkedSignal<EstadoCarritos>(() => {
    const clave = this.clave();
    const guardado = clave ? this.storage.leer(clave, esEstadoCarritos) : null;
    return guardado ?? estadoInicial(this.nombreVenta(1), null);
  });

  /** Cliente que toman las ventas nuevas, por tenant; lo resuelve `ConsumidorFinalService`. */
  private readonly contactosPorDefecto = new Map<string, ErpSelectOption>();

  /** Detalle de los ítems ya consultados (impuestos), por tenant. */
  private readonly items = new Map<string, Item>();

  /**
   * Ítems cuyo detalle se está pidiendo, con las unidades extra que se pidieron
   * mientras tanto (doble clic, dos lecturas seguidas del lector).
   */
  private readonly enCurso = new Map<string, number>();

  readonly carritos = computed(() => this.estado().carritos);
  readonly activo = computed(
    () => this.carritos().find((c) => c.uuid === this.estado().activoId) ?? this.carritos()[0],
  );
  readonly resumen = computed(() => resumenCarrito(this.activo()));
  readonly cantidadTotal = computed(() => cantidadTotal(this.activo()));
  /** Unidades de cada ítem en la venta activa: el badge de las tarjetas del catálogo. */
  readonly cantidades = computed(
    () => new Map(this.activo().lineas.map((l) => [l.item.id, l.cantidad])),
  );

  // ── Pestañas ───────────────────────────────────────────────────────────────

  seleccionar(uuid: string): void {
    this.actualizar((e) => ({ ...e, activoId: uuid }));
  }

  nueva(): void {
    this.actualizar((e) => {
      const numero = siguienteNumero(e.carritos, this.prefijoVenta());
      const carrito = crearCarrito(this.nombreVenta(numero), this.contactoPorDefecto());
      return { ...e, carritos: [...e.carritos, carrito], activoId: carrito.uuid };
    });
  }

  renombrar(uuid: string, nombre: string): void {
    const limpio = nombre.trim();
    if (!limpio) return;
    this.mutarCarrito(uuid, (c) => ({ ...c, nombre: limpio }));
  }

  /**
   * Cierra una venta. Siempre queda al menos una: cerrar la última abre una
   * nueva vacía. La activa pasa a la vecina de la que se cerró.
   */
  eliminar(uuid: string): void {
    this.actualizar((e) => {
      const indice = e.carritos.findIndex((c) => c.uuid === uuid);
      if (indice < 0) return e;
      const restantes = e.carritos.filter((c) => c.uuid !== uuid);
      if (restantes.length === 0) {
        const carrito = crearCarrito(this.nombreVenta(1), this.contactoPorDefecto());
        return { ...e, carritos: [carrito], activoId: carrito.uuid };
      }
      const activoId =
        e.activoId === uuid ? restantes[Math.min(indice, restantes.length - 1)].uuid : e.activoId;
      return { ...e, carritos: restantes, activoId };
    });
  }

  vaciar(uuid: string): void {
    this.mutarCarrito(uuid, (c) => ({ ...c, lineas: [] }));
  }

  // ── Cliente ────────────────────────────────────────────────────────────────

  /**
   * Fija el "Consumidor final" como cliente por defecto: lo toman las ventas
   * nuevas y las abiertas que todavía no tienen cliente.
   */
  usarContactoPorDefecto(contacto: ErpSelectOption | null): void {
    const slug = this.slug();
    const porDefecto = contactoParaGuardar(contacto);
    if (!slug || !porDefecto) return;
    this.contactosPorDefecto.set(slug, porDefecto);
    this.actualizar((e) => ({
      ...e,
      carritos: e.carritos.map((c) => (c.contacto ? c : { ...c, contacto: porDefecto })),
    }));
  }

  /**
   * Cambia el cliente de la venta activa y recotiza sus líneas contra la lista
   * de precios del nuevo (las editadas a mano se respetan).
   */
  cambiarContacto(contacto: ErpSelectOption | null): Observable<void> {
    const uuid = this.activo().uuid;
    const guardado = contactoParaGuardar(contacto);
    this.mutarCarrito(uuid, (c) => ({ ...c, contacto: guardado }));
    const lineas = this.activo().lineas.filter((l) => !l.precioEditado);
    if (lineas.length === 0) return of(undefined);
    return forkJoin(
      lineas.map((l) =>
        this.precioEnLista(guardado, l.item.id).pipe(map((precio) => [l.item.id, precio] as const)),
      ),
    ).pipe(
      tap((precios) => this.mutarCarrito(uuid, (c) => recotizar(c, new Map(precios)))),
      map(() => undefined),
    );
  }

  // ── Líneas ─────────────────────────────────────────────────────────────────

  /**
   * Suma una unidad del producto a la venta activa. Si ya está, solo aumenta la
   * cantidad; si es nuevo, primero trae su detalle (impuestos) y su precio en la
   * lista del cliente. Nunca supera el stock disponible.
   */
  agregarProducto(producto: ProductoCatalogo): Observable<ResultadoAgregar> {
    const carrito = this.activo();
    const existente = buscarLinea(carrito, producto.id);
    if (existente) return of(this.fijarCantidad(producto.id, existente.cantidad + 1));
    if (producto.disponible !== null && producto.disponible < 1) return of('sinStock');

    const clave = `${carrito.uuid}:${producto.id}`;
    const pendientes = this.enCurso.get(clave);
    if (pendientes !== undefined) {
      this.enCurso.set(clave, pendientes + 1);
      return of('agregado');
    }
    this.enCurso.set(clave, 0);

    return forkJoin({
      item: this.detalleItem(producto.id),
      precio: this.precioEnLista(carrito.contacto, producto.id),
    }).pipe(
      map(({ item, precio }) => {
        const pedidas = 1 + (this.enCurso.get(clave) ?? 0);
        this.enCurso.delete(clave);
        const linea = lineaDesdeProducto(
          producto,
          item,
          precio,
          this.configuracion.configuracion().almacen,
        );
        const cantidad = linea.disponible === null ? pedidas : Math.min(pedidas, linea.disponible);
        this.mutarCarrito(carrito.uuid, (c) =>
          buscarLinea(c, producto.id)
            ? c
            : conCantidad(agregarLinea(c, linea), producto.id, cantidad),
        );
        return cantidad < pedidas ? 'sinStock' : 'agregado';
      }),
      catchError(() => {
        this.enCurso.delete(clave);
        return of<ResultadoAgregar>('error');
      }),
    );
  }

  /** Fija la cantidad de una línea de la venta activa; en 0, la retira. */
  fijarCantidad(itemId: number, cantidad: number): ResultadoAgregar {
    const linea = buscarLinea(this.activo(), itemId);
    if (!linea) return 'error';
    if (cantidad > 0 && !cabeEnStock(linea, cantidad)) return 'sinStock';
    this.mutarCarrito(this.activo().uuid, (c) => conCantidad(c, itemId, cantidad));
    return 'agregado';
  }

  /** Edición manual de precio y cantidad. La cantidad ya viene validada contra el stock. */
  editarLinea(
    itemId: number,
    cambios: { readonly precio: number; readonly cantidad: number },
  ): void {
    this.mutarCarrito(this.activo().uuid, (c) => editarLinea(c, itemId, cambios));
  }

  retirarLinea(itemId: number): void {
    this.mutarCarrito(this.activo().uuid, (c) => retirarLinea(c, itemId));
  }

  // ── Internos ───────────────────────────────────────────────────────────────

  private detalleItem(id: number): Observable<Item> {
    const clave = `${this.slug() ?? ''}:${id}`;
    const enCache = this.items.get(clave);
    if (enCache) return of(enCache);
    return this.itemService.getById(id).pipe(tap((item) => this.items.set(clave, item)));
  }

  /** Precio del ítem en la lista del contacto; `null` si no tiene lista o no lo cotiza. */
  private precioEnLista(
    contacto: ErpSelectOption | null,
    itemId: number,
  ): Observable<number | null> {
    const precioId = precioListaDeContacto(contacto);
    if (precioId === null) return of(null);
    return this.precioDetalle
      .consultarPrecioItem(precioId, itemId)
      .pipe(catchError(() => of(null)));
  }

  private mutarCarrito(uuid: string, fn: (carrito: Carrito) => Carrito): void {
    this.actualizar((e) => ({
      ...e,
      carritos: e.carritos.map((c) => (c.uuid === uuid ? fn(c) : c)),
    }));
  }

  private actualizar(fn: (estado: EstadoCarritos) => EstadoCarritos): void {
    const siguiente = fn(this.estado());
    this.estado.set(siguiente);
    const clave = this.clave();
    if (clave) this.storage.escribir(clave, siguiente);
  }

  private contactoPorDefecto(): ErpSelectOption | null {
    const slug = this.slug();
    return slug ? (this.contactosPorDefecto.get(slug) ?? null) : null;
  }

  private prefijoVenta(): string {
    return this.i18n.t().caja.carrito.prefijoVenta;
  }

  private nombreVenta(numero: number): string {
    return `${this.prefijoVenta()} ${numero}`;
  }
}
