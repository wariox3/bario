import { Injectable, type OnDestroy, computed, inject, signal } from '@angular/core';
import { EMPTY, type Observable, type Subscription, catchError, map, tap } from 'rxjs';
import { ItemService, type FilterCondition, type ListQuery } from '@reddoc/core';
import type { ProductoCatalogo } from './producto-catalogo.model';
import { esVendible, itemToProductoCatalogo } from './producto-catalogo.mapper';

/** Cómo se busca en el catálogo: por texto libre o por código exacto (lector de barras). */
export type ModoBusqueda = 'nombre' | 'codigo';

export interface CriterioBusqueda {
  readonly modo: ModoBusqueda;
  readonly texto: string;
}

export type EstadoCatalogo = 'cargando' | 'listo' | 'error';

/** Lo que el catálogo nunca muestra: ítems que no son de venta o están inactivos. */
const FILTROS_BASE: readonly FilterCondition[] = [
  { field: 'venta', operator: 'eq', value: true },
  { field: 'inactivo', operator: 'eq', value: false },
];

/**
 * Filtros de la búsqueda. Van **antes** que los base porque el backend evalúa
 * en secuencia: `(nombre O código) Y venta Y activo`. Al revés, el `O` se
 * comería los filtros base.
 */
function filtrosDeBusqueda(criterio: CriterioBusqueda): readonly FilterCondition[] {
  const texto = criterio.texto.trim();
  if (!texto) return [];
  if (criterio.modo === 'codigo') return [{ field: 'codigo', operator: 'eq', value: texto }];
  return [
    { field: 'nombre', operator: 'contains', value: texto },
    { field: 'codigo', operator: 'contains', value: texto, logic: 'OR' },
  ];
}

/**
 * Catálogo de la caja: los ítems vendibles del tenant, con búsqueda, paginación
 * incremental y favoritos. Se provee en la página de la caja.
 *
 * Orden: favoritos primero y luego por nombre. Marcar un favorito no reordena
 * en el momento (la tarjeta saltaría bajo el cursor); el orden nuevo entra en la
 * próxima búsqueda.
 */
@Injectable()
export class CatalogoStore implements OnDestroy {
  private readonly itemService = inject(ItemService);

  private readonly _productos = signal<readonly ProductoCatalogo[]>([]);
  private readonly _estado = signal<EstadoCatalogo>('cargando');
  private readonly _cargandoMas = signal(false);
  private readonly total = signal(0);
  /** Filas que devolvió el backend, antes del filtro de vendibles: es lo que pagina. */
  private readonly recibidos = signal(0);

  private criterio: CriterioBusqueda = { modo: 'nombre', texto: '' };
  private pagina = 0;
  private peticion?: Subscription;
  /** Sube con cada búsqueda: una respuesta de una búsqueda vieja se descarta. */
  private turno = 0;

  readonly productos = this._productos.asReadonly();
  readonly estado = this._estado.asReadonly();
  readonly cargandoMas = this._cargandoMas.asReadonly();
  readonly hayMas = computed(() => this.recibidos() < this.total());

  /** Arranca una búsqueda nueva desde la primera página. */
  buscar(criterio: CriterioBusqueda): void {
    this.peticion?.unsubscribe();
    this.peticion = this.iniciar(criterio).subscribe();
  }

  /**
   * Busca un código exacto (lector de barras) y devuelve el producto si hay uno
   * solo con ese código; el catálogo queda mostrando el resultado igual que una
   * búsqueda normal. Quien llama se suscribe y decide qué hacer con el producto.
   */
  buscarCodigo(codigo: string): Observable<ProductoCatalogo | null> {
    this.peticion?.unsubscribe();
    const texto = codigo.trim();
    return this.iniciar({ modo: 'codigo', texto }).pipe(
      map((productos) => {
        const exactos = productos.filter((p) => p.codigo === texto);
        return exactos.length === 1 ? exactos[0] : null;
      }),
    );
  }

  /** Vuelve a pedir la búsqueda actual (reintentar, o refrescar el stock tras vender). */
  recargar(): void {
    this.buscar(this.criterio);
  }

  cargarMas(): void {
    if (!this.hayMas() || this._cargandoMas()) return;
    this.pagina += 1;
    this._cargandoMas.set(true);
    this.peticion = this.pedir().subscribe();
  }

  /**
   * Marca o desmarca un favorito. La tarjeta cambia en el acto y, si el backend
   * lo rechaza, vuelve a como estaba; el error lo informa quien se suscribe.
   */
  alternarFavorito(id: number): Observable<void> {
    const actual = this._productos().find((p) => p.id === id);
    const favorito = !actual?.favorito;
    this.marcarFavorito(id, favorito);
    return this.itemService.actualizarFavorito(id, favorito).pipe(
      tap({ error: () => this.marcarFavorito(id, !favorito) }),
      map(() => undefined),
    );
  }

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
  }

  private marcarFavorito(id: number, favorito: boolean): void {
    this._productos.update((lista) => lista.map((p) => (p.id === id ? { ...p, favorito } : p)));
  }

  private iniciar(criterio: CriterioBusqueda): Observable<readonly ProductoCatalogo[]> {
    this.criterio = criterio;
    this.pagina = 0;
    this._estado.set('cargando');
    this._cargandoMas.set(false);
    return this.pedir();
  }

  /** Pide la página actual y la vuelca en el estado; emite los productos recibidos. */
  private pedir(): Observable<readonly ProductoCatalogo[]> {
    const turno = ++this.turno;
    const agregar = this.pagina > 0;
    const query: ListQuery = {
      filters: [...filtrosDeBusqueda(this.criterio), ...FILTROS_BASE],
      sort: [
        { field: 'favorito', direction: 'desc' },
        { field: 'nombre', direction: 'asc' },
      ],
      page: this.pagina,
    };
    return this.itemService.list(query).pipe(
      map((respuesta) => ({
        respuesta,
        nuevos: respuesta.results.filter(esVendible).map(itemToProductoCatalogo),
      })),
      tap(({ respuesta, nuevos }) => {
        if (turno !== this.turno) return;
        this._productos.update((lista) => (agregar ? [...lista, ...nuevos] : nuevos));
        this.recibidos.update((n) => (agregar ? n : 0) + respuesta.results.length);
        this.total.set(respuesta.count);
        this._estado.set('listo');
        this._cargandoMas.set(false);
      }),
      map(({ nuevos }) => nuevos),
      catchError(() => {
        if (turno === this.turno) {
          this._cargandoMas.set(false);
          if (agregar) {
            // Falló una página adicional: lo ya cargado sigue valiendo.
            this.pagina -= 1;
          } else {
            this._productos.set([]);
            this._estado.set('error');
          }
        }
        return EMPTY;
      }),
    );
  }
}
