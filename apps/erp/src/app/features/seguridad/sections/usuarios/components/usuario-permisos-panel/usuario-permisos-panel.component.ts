import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import {
  I18nService,
  ToastService,
  type PaginatedResponse,
  type PermisoAsignado,
  type PermisoCatalogoFiltros,
  type PermisoSeguridad,
  type UsuarioPermiso,
} from '@reddoc/core';
import { PERMISO_APPS } from '@erp/core/permissions';
import type { AppDict } from '@erp/i18n';
import { ACCIONES_PERMISO, type AccionColumna } from '../../usuarios.constants';
import { SeguridadUsuariosService } from '../../usuarios.service';
import {
  agruparPermisos,
  permisoCatalogoKey,
  type PermisoAppGrupo,
  type PermisoModeloFila,
} from '../../usuarios.utils';

/**
 * Apps del backend para las pills: la lista declarada en `PERMISO_APPS` (datos
 * sembrados que no se descubren en runtime, mismo criterio que los ids de
 * modelo). Si aparece una app nueva al navegar el catálogo, `registrarApps` la
 * suma sola.
 */
const APPS_CATALOGO: readonly string[] = PERMISO_APPS;

const LIMITE_DEFAULT = 25;

const PAGINA_VACIA: PaginatedResponse<PermisoSeguridad> = {
  count: 0,
  next: null,
  previous: null,
  results: [],
};

/**
 * Permisos directos del miembro: la tab responde primero "¿qué tiene?" — la
 * matriz de `permiso.permisos` agrupada app → modelo × acción (el backend
 * manda el mismo serializador del catálogo, con `modelo_label` y `nombre`).
 * Entrar a la tab no dispara peticiones: los asignados ya vienen con el
 * detalle.
 *
 * Agregar es acción explícita: el botón abre un dialog con el **picker** — la
 * matriz del catálogo de `/seguridad/permiso/` (app → modelo × acción) con
 * filtros y paginación resueltos en el backend (`?app=`, `?accion=`,
 * `?search=`, `?page=`, `?limit=`): pills por app (del espejo estático
 * `MODELO`), buscador con debounce, lente por acción que colapsa la matriz a
 * esa columna y `p-paginator` al pie. El catálogo recién se consulta al abrir
 * el dialog, y cada consulta queda cacheada en el servicio.
 *
 * Gestionar es tocar (chip o celda): toggle **optimista** contra
 * `agregar-permiso/` / `quitar-permiso/` — responde al instante, toast al
 * confirmar, revierte si el backend falla (el toast de error lo pone el
 * `errorInterceptor` global) y el control queda bloqueado mientras la
 * petición vuela. La lista principal y el picker comparten estado: togglear
 * en uno se refleja en el otro.
 */
@Component({
  selector: 'app-usuario-permisos-panel',
  standalone: true,
  imports: [ButtonModule, DialogModule, PaginatorModule],
  templateUrl: './usuario-permisos-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioPermisosPanelComponent {
  private readonly service = inject(SeguridadUsuariosService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly toast = inject(ToastService);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;
  protected readonly acciones = ACCIONES_PERMISO;

  /** `usuario_id` del miembro (el que espera `agregar-permiso/`). */
  readonly usuarioId = input.required<number>();

  /** Bloque `permiso` del miembro; `null` mientras no llega o si falló. */
  readonly permiso = input<UsuarioPermiso | null>(null);

  /** Dialog del picker de catálogo. */
  protected readonly pickerAbierto = signal(false);

  protected readonly busqueda = signal('');
  /** App de la pill activa; `null` = todas. */
  protected readonly appActiva = signal<string | null>(null);
  /** Página 1-based del `p-paginator`. */
  protected readonly pagina = signal(1);
  /** Tamaño de página fijo: el paginador no expone el selector. */
  protected readonly limite = signal(LIMITE_DEFAULT);

  /** Página visible de la consulta activa (ya filtrada por el backend). */
  protected readonly resultado = signal<readonly PermisoSeguridad[]>([]);
  /** Total de la consulta activa (todas sus páginas); pagina el `count`. */
  protected readonly totalResultados = signal(0);
  /** Primera consulta del picker: aún no hay nada que mostrar. */
  protected readonly isLoadingInicial = signal(true);
  /** Consulta en vuelo con resultados previos en pantalla: solo se atenúa. */
  protected readonly isBuscando = signal(false);

  /** Apps para las pills: espejo `MODELO` + lo visto al navegar (solo crece). */
  protected readonly apps = signal<readonly string[]>(APPS_CATALOGO);

  private readonly busquedaDebounced = toSignal(
    toObservable(this.busqueda).pipe(
      map((termino) => termino.trim()),
      debounceTime(300),
    ),
    { initialValue: '' },
  );

  private readonly filtros = computed<PermisoCatalogoFiltros>(() => ({
    app: this.appActiva() ?? undefined,
    search: this.busquedaDebounced() || undefined,
    page: this.pagina(),
    limit: this.limite(),
  }));

  protected readonly tieneFlags = computed(() => {
    const p = this.permiso();
    return p != null && (p.is_superuser || p.is_staff);
  });

  /**
   * Permisos directos del miembro. Editable (el toggle optimista lo muta) y
   * re-sincronizado si el `permiso` del input cambia.
   */
  private readonly asignados = linkedSignal<readonly PermisoAsignado[]>(
    () => this.permiso()?.permisos ?? [],
  );

  private readonly asignadosIds = computed<ReadonlySet<number>>(
    () => new Set(this.asignados().map((p) => p.id)),
  );

  /** Ids con petición en vuelo: el control se bloquea hasta que responda. */
  protected readonly pendientes = signal<readonly number[]>([]);

  /** Celdas `modelo|accion` resolviendo su id contra el catálogo. */
  protected readonly pendientesCeldas = signal<readonly string[]>([]);

  /** Matriz principal: los permisos activos agrupados app → modelo × acción. */
  protected readonly misPermisos = computed<readonly PermisoAppGrupo[]>(() =>
    agruparPermisos(this.asignados()),
  );

  /** Matriz del picker agrupada app → modelo de la página visible. */
  protected readonly grupos = computed<readonly PermisoAppGrupo[]>(() =>
    agruparPermisos(this.resultado()),
  );

  protected readonly countLabel = computed(() => {
    const dict = this.t().seguridad.usuarios.detalle.permisos.count;
    const n = this.asignados().length;
    if (n === 0) return dict.zero;
    return n === 1 ? dict.one : dict.other.replace('{n}', String(n));
  });

  constructor() {
    // El catálogo solo se consulta con el picker abierto; cerrar y reabrir con
    // los mismos filtros no re-consulta (dedupe por clave + cache del servicio).
    toObservable(computed(() => ({ abierto: this.pickerAbierto(), filtros: this.filtros() })))
      .pipe(
        filter(({ abierto }) => abierto),
        map(({ filtros }) => filtros),
        distinctUntilChanged((a, b) => permisoCatalogoKey(a) === permisoCatalogoKey(b)),
        tap(() => this.isBuscando.set(true)),
        switchMap((filtros) =>
          this.service.getCatalogoPermisos(filtros).pipe(catchError(() => of(PAGINA_VACIA))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((paginaResultado) => {
        this.resultado.set(paginaResultado.results);
        this.totalResultados.set(paginaResultado.count);
        this.isBuscando.set(false);
        this.isLoadingInicial.set(false);
        this.registrarApps(paginaResultado.results);
      });
  }

  protected abrirPicker(): void {
    this.pickerAbierto.set(true);
  }

  protected tieneAsignado(id: number): boolean {
    return this.asignadosIds().has(id);
  }

  protected estaPendiente(id: number): boolean {
    return this.pendientes().includes(id);
  }

  protected estaPendienteCelda(modelo: string, accion: string): boolean {
    return this.pendientesCeldas().includes(`${modelo}|${accion}`);
  }

  /**
   * Agrega desde la matriz principal una acción que el miembro no tiene. Los
   * asignados no traen los ids del resto del catálogo, así que primero se
   * resuelve el permiso con una consulta puntual (`?modelo=&accion=`, cacheada
   * en el servicio) y después entra el toggle optimista normal.
   */
  protected agregarDesdeLista(modelo: string, accion: AccionColumna): void {
    const clave = `${modelo}|${accion}`;
    if (this.pendientesCeldas().includes(clave)) return;
    this.pendientesCeldas.update((claves) => [...claves, clave]);
    this.service
      .getCatalogoPermisos({ modelo, accion, limit: 1 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pagina) => {
          this.pendientesCeldas.update((claves) => claves.filter((k) => k !== clave));
          const permiso = pagina.results[0];
          if (permiso) this.toggle(permiso);
        },
        error: () => this.pendientesCeldas.update((claves) => claves.filter((k) => k !== clave)),
      });
  }

  /** Toggle optimista (celda de la matriz principal o del picker). */
  protected toggle(permisoItem: PermisoSeguridad): void {
    if (this.estaPendiente(permisoItem.id)) return;
    const usuarioId = this.usuarioId();
    const teniaPermiso = this.tieneAsignado(permisoItem.id);
    const etiqueta = permisoItem.nombre;

    // Optimista: la lista cambia ya; si el backend falla, se revierte abajo.
    this.asignados.update((lista) =>
      teniaPermiso ? lista.filter((p) => p.id !== permisoItem.id) : [...lista, permisoItem],
    );
    this.pendientes.update((ids) => [...ids, permisoItem.id]);

    const request = teniaPermiso
      ? this.service.removePermiso(usuarioId, permisoItem.id)
      : this.service.addPermiso(usuarioId, permisoItem.id);

    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.pendientes.update((ids) => ids.filter((i) => i !== permisoItem.id));
        const toasts = this.t().seguridad.usuarios.detalle.permisos.toasts;
        const toast = teniaPermiso ? toasts.removed : toasts.added;
        this.toast.success(toast.title, toast.desc.replace('{permiso}', etiqueta));
      },
      error: () => {
        this.pendientes.update((ids) => ids.filter((i) => i !== permisoItem.id));
        this.asignados.update((lista) =>
          teniaPermiso ? [...lista, permisoItem] : lista.filter((p) => p.id !== permisoItem.id),
        );
      },
    });
  }

  protected onBusquedaInput(event: Event): void {
    this.busqueda.set((event.target as HTMLInputElement).value);
    this.pagina.set(1);
  }

  protected seleccionarApp(app: string | null): void {
    this.appActiva.set(app);
    this.pagina.set(1);
  }

  /** Solo cambia de página: el tamaño es fijo, el paginador no lo ofrece. */
  protected onPage(event: PaginatorState): void {
    this.pagina.set((event.page ?? 0) + 1);
  }

  protected pillClass(activa: boolean): string {
    const base = 'rounded-full border px-3 py-1 text-[0.78rem] font-medium transition-colors ';
    return activa
      ? base + 'border-transparent bg-brand-navy text-white'
      : base + 'border-[rgba(20,48,73,0.12)] text-brand-muted hover:bg-[rgba(20,48,73,0.04)]';
  }

  /**
   * Celda de la matriz: la caja es idéntica en ambos estados (mismo display,
   * tamaño, borde e ícono siempre presentes) y solo cambia la tinta — así el
   * toggle no salta de tamaño ni de posición. El check se insinúa al hover
   * cuando no está asignado.
   */
  protected celdaClass(asignado: boolean): string {
    const base =
      'inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(20,48,73,0.4)] disabled:cursor-wait disabled:opacity-40 ';
    return asignado
      ? base + 'border-brand-navy bg-brand-navy text-white'
      : base +
          'border-[rgba(20,48,73,0.2)] bg-transparent text-transparent hover:border-[rgba(20,48,73,0.45)] hover:bg-[rgba(20,48,73,0.04)] hover:text-[rgba(20,48,73,0.35)]';
  }

  // ── Fila completa (el contador n/4 del picker) ─────────────────────────────

  /**
   * Celdas estándar de la fila, en el orden de las columnas.
   *
   * Solo las cuatro acciones de la matriz: los permisos **custom** (`extras`) se
   * quedan afuera a propósito — son puntuales y no forman parte de "todo lo
   * normal sobre este modelo", así que no se barren de un clic.
   */
  private celdasDeFila(fila: PermisoModeloFila): readonly PermisoSeguridad[] {
    return ACCIONES_PERMISO.map((accion) => fila.porAccion.get(accion)).filter(
      (permiso): permiso is PermisoSeguridad => permiso !== undefined,
    );
  }

  /** Cuántas de las acciones de la fila ya tiene el miembro. */
  protected filaAsignadas(fila: PermisoModeloFila): number {
    return this.celdasDeFila(fila).filter((celda) => this.tieneAsignado(celda.id)).length;
  }

  /** Cuántas acciones trajo la consulta para esta fila (denominador del contador). */
  protected filaTotal(fila: PermisoModeloFila): number {
    return this.celdasDeFila(fila).length;
  }

  protected filaCompleta(fila: PermisoModeloFila): boolean {
    const total = this.filaTotal(fila);
    return total > 0 && this.filaAsignadas(fila) === total;
  }

  /** Qué hace el contador si lo tocás — es el único texto que lo explica. */
  protected filaTitulo(fila: PermisoModeloFila): string {
    const dict = this.t().seguridad.usuarios.detalle.permisos.fila;
    const plantilla = this.filaCompleta(fila) ? dict.quitarHint : dict.darHint;
    return plantilla
      .replace('{total}', String(this.filaTotal(fila)))
      .replace('{modelo}', fila.label);
  }

  protected filaPendiente(fila: PermisoModeloFila): boolean {
    return this.celdasDeFila(fila).some((celda) => this.estaPendiente(celda.id));
  }

  /**
   * Otorga de un golpe todas las acciones del modelo, o las quita todas si ya
   * las tiene. Es el atajo de la fila: dar "ver + agregar + cambiar + eliminar"
   * sobre un modelo es lo que se hace el 90% de las veces, y de a una son cuatro
   * clics y cuatro toasts.
   *
   * El backend agrega de a uno, así que el lote sale en paralelo. Cada petición
   * se resuelve por separado (no `forkJoin` que aborta al primer error): las que
   * fallan se revierten una por una y las que entraron se quedan, para que la
   * matriz muestre lo que de verdad quedó guardado. Un solo toast al final.
   */
  protected toggleFila(fila: PermisoModeloFila): void {
    const celdas = this.celdasDeFila(fila);
    if (celdas.length === 0 || this.filaPendiente(fila)) return;

    const quitando = this.filaCompleta(fila);
    // Al dar, solo las que faltan: repetir las que ya tiene sería ruido.
    const objetivo = quitando ? celdas : celdas.filter((celda) => !this.tieneAsignado(celda.id));
    if (objetivo.length === 0) return;

    const usuarioId = this.usuarioId();
    const objetivoIds = new Set(objetivo.map((celda) => celda.id));

    this.asignados.update((lista) =>
      quitando ? lista.filter((permiso) => !objetivoIds.has(permiso.id)) : [...lista, ...objetivo],
    );
    this.pendientes.update((ids) => [...ids, ...objetivoIds]);

    forkJoin(
      objetivo.map((celda) =>
        (quitando
          ? this.service.removePermiso(usuarioId, celda.id)
          : this.service.addPermiso(usuarioId, celda.id)
        ).pipe(
          map(() => ({ celda, ok: true })),
          catchError(() => of({ celda, ok: false })),
        ),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((resultados) => {
        this.pendientes.update((ids) => ids.filter((id) => !objetivoIds.has(id)));

        const fallidas = resultados.filter((r) => !r.ok).map((r) => r.celda);
        if (fallidas.length > 0) {
          const fallidasIds = new Set(fallidas.map((celda) => celda.id));
          this.asignados.update((lista) =>
            quitando
              ? [...lista, ...fallidas]
              : lista.filter((permiso) => !fallidasIds.has(permiso.id)),
          );
        }

        const aplicadas = resultados.length - fallidas.length;
        if (aplicadas === 0) return;
        const toasts = this.t().seguridad.usuarios.detalle.permisos.toasts;
        const toast = quitando ? toasts.filaRemoved : toasts.filaAdded;
        this.toast.success(
          toast.title,
          toast.desc.replace('{n}', String(aplicadas)).replace('{modelo}', fila.label),
        );
      });
  }

  /**
   * Contador de la fila: mismo recuadro en los tres estados (vacía, parcial,
   * completa) y solo cambia la tinta — el número dice qué hay, el clic dice qué
   * hacer. Ficha navy del sistema: tinte = tiene valor, sólido = está lleno.
   */
  protected filaTodoClass(asignadas: number, total: number): string {
    const base =
      'inline-flex shrink-0 cursor-pointer items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.68rem] font-semibold tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(20,48,73,0.4)] disabled:cursor-wait disabled:opacity-40 ';
    if (asignadas === total) return base + 'border-brand-navy bg-brand-navy text-white';
    if (asignadas > 0) return base + 'border-transparent bg-[rgba(20,48,73,0.06)] text-brand-text';
    return (
      base +
      'border-[rgba(20,48,73,0.12)] text-brand-muted hover:border-[rgba(20,48,73,0.35)] hover:bg-[rgba(20,48,73,0.04)] hover:text-brand-text'
    );
  }

  /** Chip de permiso custom del picker: mismo criterio — geometría fija. */
  protected extraChipClass(asignado: boolean): string {
    const base =
      'inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[0.68rem] font-medium transition-colors disabled:cursor-wait disabled:opacity-40 ';
    return asignado
      ? base + 'bg-brand-navy text-white'
      : base + 'bg-[rgba(20,48,73,0.05)] text-brand-muted hover:bg-[rgba(20,48,73,0.1)]';
  }

  /** Suma apps nuevas a las pills sin perder las ya conocidas. */
  private registrarApps(permisos: readonly PermisoSeguridad[]): void {
    const conocidas = this.apps();
    const nuevas: string[] = [];
    for (const p of permisos) {
      if (!conocidas.includes(p.app) && !nuevas.includes(p.app)) nuevas.push(p.app);
    }
    if (nuevas.length > 0) this.apps.set([...conocidas, ...nuevas]);
  }
}
