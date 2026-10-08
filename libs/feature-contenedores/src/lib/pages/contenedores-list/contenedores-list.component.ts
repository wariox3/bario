import { Component, DestroyRef, ViewChild, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  EMPTY,
  Subject,
  catchError,
  distinctUntilChanged,
  exhaustMap,
  forkJoin,
  map,
  of,
  startWith,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import {
  AUTH_SERVICE,
  Contenedor,
  ContenedorDetalle,
  ContenedorEstado,
  ContenedorService,
  ENVIRONMENT,
  getInitials,
  I18nService,
  TENANT_ROUTES,
  TenantService,
  ToastService,
} from '@reddoc/core';
import { isSuscripcionExpired } from '../../utils/contenedor-suscripcion.utils';
import { ContenedoresCreateDialogComponent } from '../../components/create-dialog/contenedores-create-dialog.component';
import { ContenedoresDeleteDialogComponent } from '../../components/delete-dialog/contenedores-delete-dialog.component';
import { ContenedoresInviteDialogComponent } from '../../components/invite-dialog/contenedores-invite-dialog.component';
import { ContenedorRowItemComponent } from '../../components/contenedor-row-item/contenedor-row-item.component';
import { ContenedorCardItemComponent } from '../../components/contenedor-card-item/contenedor-card-item.component';
import { CONTENEDORES_CAPABILITIES_FULL } from '../../contenedores.capabilities';
import type { ContenedoresCapabilities } from '../../contenedores.capabilities';
import type { ContenedoresTranslationsHost } from '../../i18n';

/** Cada cuánto se consulta el estado de los contenedores que se están creando. */
const ESTADO_POLL_MS = 5000;

/** Lo que `/estado/` respondió para un contenedor en una vuelta del sondeo. */
interface EstadoConsultado {
  readonly id: number;
  readonly estado: ContenedorEstado;
  readonly paso: string | null;
}

@Component({
  selector: 'lib-contenedores-list',
  standalone: true,
  imports: [
    ContenedoresCreateDialogComponent,
    ContenedoresDeleteDialogComponent,
    ContenedoresInviteDialogComponent,
    ContenedorRowItemComponent,
    ContenedorCardItemComponent,
    MenuModule,
    ButtonModule,
  ],
  templateUrl: './contenedores-list.component.html',
  styleUrl: './contenedores-list.component.scss',
})
export class ContenedoresListComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AUTH_SERVICE);
  protected readonly router = inject(Router);
  private readonly tenant = inject(TenantService);
  private readonly tenantRoutes = inject(TENANT_ROUTES);
  private readonly env = inject(ENVIRONMENT);
  private readonly toastService = inject(ToastService);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  /**
   * Acciones habilitadas. Cada app la pasa por `data` de su ruta de
   * contenedores; `withComponentInputBinding()` la ata a este input.
   */
  readonly capabilities = input<ContenedoresCapabilities>(CONTENEDORES_CAPABILITIES_FULL);

  /** El menú de fila solo se dibuja si hay al menos una acción adentro. */
  readonly hasRowActions = computed(() => {
    const caps = this.capabilities();
    return caps.invite || caps.edit || caps.subscription || caps.delete;
  });

  readonly showCreate = signal(false);
  readonly showEdit = signal(false);
  readonly showDelete = signal(false);
  readonly showInvite = signal(false);
  readonly contenedorToEdit = signal<ContenedorDetalle | null>(null);
  readonly contenedorToDelete = signal<Contenedor | null>(null);
  readonly contenedorToInvite = signal<Contenedor | null>(null);

  readonly viewMode = signal<'list' | 'grid'>('list');

  private readonly reload$ = new Subject<void>();

  readonly currentUser = this.authService.currentUser;

  /**
   * Estados que `/estado/` reportó después de la última carga de la lista. Pisan
   * el de la fila para que deje de figurar `creando` sin esperar a la recarga.
   */
  private readonly estadosConsultados = signal<ReadonlyMap<number, ContenedorEstado>>(new Map());

  /**
   * Último `paso` conocido de cada contenedor en creación. Solo se pisa con un
   * paso nuevo: `/estado/` puede responder sin él (sale de caché) y el CTA no
   * debe volver atrás a «Creando…».
   */
  private readonly pasos = signal<ReadonlyMap<number, string>>(new Map());

  /** Texto del CTA de cada contenedor en creación: su último paso, tal cual lo manda el backend. */
  readonly creatingLabels = computed(() => {
    const plantilla = this.t().contenedores.list.estado.creandoPaso;
    const labels = new Map<number, string>();
    for (const [id, paso] of this.pasos()) labels.set(id, plantilla.replace('{paso}', paso));
    return labels;
  });

  readonly response = toSignal(
    this.reload$.pipe(
      startWith(undefined),
      switchMap(() => this.contenedorService.getAccesos()),
      // La lista recién traída ya refleja cada estado: lo consultado aparte sobra.
      tap(() => this.estadosConsultados.set(new Map())),
    ),
  );

  readonly isLoading = computed(() => this.response() === undefined);

  readonly contenedores = computed(() => {
    const results = this.response()?.results ?? [];
    const estados = this.estadosConsultados();
    if (!estados.size) return results;
    return results.map((c) => {
      const estado = estados.get(c.cliente_id);
      return estado ? { ...c, estado } : c;
    });
  });

  /** Ids que siguen en creación, como clave estable para reiniciar el sondeo solo si cambian. */
  private readonly idsCreando = computed(() =>
    this.contenedores()
      .filter((c) => c.estado === 'creando')
      .map((c) => c.cliente_id)
      .join(','),
  );

  readonly searchQuery = signal('');

  readonly filteredContenedores = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.contenedores();
    return this.contenedores().filter(
      (c) =>
        c.cliente_nombre.toLowerCase().includes(q) ||
        c.schema_name.toLowerCase().includes(q) ||
        c.dominio.toLowerCase().includes(q),
    );
  });

  readonly counts = computed(() => {
    const all = this.contenedores();
    return { total: all.length, active: all.filter((c) => c.activo).length };
  });

  readonly summaryText = computed(() => {
    const { total, active } = this.counts();
    const labels = this.t().contenedores.list.summary;
    const cWord = total === 1 ? labels.containers.one : labels.containers.other;
    const aWord = active === 1 ? labels.active.one : labels.active.other;
    return `${total} ${cWord} · ${active} ${aWord}`;
  });

  readonly skeletonItems = Array.from({ length: 5 });

  @ViewChild('rowMenu') private rowMenu!: Menu;
  protected rowMenuItems: MenuItem[] = [];

  constructor() {
    this.pollEstados();
  }

  /**
   * La creación corre en segundo plano: mientras haya contenedores `creando`
   * —recién dados de alta o que ya venían así al cargar la página— se consulta
   * su estado cada `ESTADO_POLL_MS`. `exhaustMap` evita apilar consultas si el
   * backend tarda más que el intervalo.
   */
  private pollEstados(): void {
    toObservable(this.idsCreando)
      .pipe(
        distinctUntilChanged(),
        switchMap((key) => {
          if (!key) return EMPTY;
          const ids = key.split(',').map(Number);
          return timer(ESTADO_POLL_MS, ESTADO_POLL_MS).pipe(
            exhaustMap(() =>
              forkJoin(
                ids.map((id) =>
                  this.contenedorService.getEstado(id).pipe(
                    map(({ estado, paso }): EstadoConsultado => ({ id, estado, paso })),
                    // Una consulta fallida no corta el sondeo: se reintenta en el próximo tick.
                    catchError(() => of(null)),
                  ),
                ),
              ),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((respuestas) => {
        const resultados = respuestas.filter((r): r is EstadoConsultado => !!r);

        const conPaso = resultados.filter((r) => r.estado === 'creando' && r.paso);
        if (conPaso.some((r) => this.pasos().get(r.id) !== r.paso)) {
          this.pasos.update((prev) => {
            const next = new Map(prev);
            for (const { id, paso } of conPaso) if (paso) next.set(id, paso);
            return next;
          });
        }

        const terminados = resultados.filter((r) => r.estado !== 'creando');
        if (terminados.length) this.onCreacionTerminada(terminados);
      });
  }

  private onCreacionTerminada(terminados: readonly EstadoConsultado[]): void {
    const nombres = new Map(this.contenedores().map((c) => [c.cliente_id, c.cliente_nombre]));
    const toasts = this.t().contenedores.list.toasts;
    for (const { id, estado } of terminados) {
      const nombre = nombres.get(id) ?? '';
      if (estado === 'listo') {
        this.toastService.success(
          toasts.ready.title,
          toasts.ready.desc.replace('{nombre}', nombre),
        );
      } else {
        this.toastService.error(
          toasts.failed.title,
          toasts.failed.desc.replace('{nombre}', nombre),
        );
      }
    }

    this.estadosConsultados.update((prev) => {
      const next = new Map(prev);
      for (const { id, estado } of terminados) next.set(id, estado);
      return next;
    });
    // Un contenedor listo trae dominio y suscripción definitivos: se recarga la lista.
    if (terminados.some((t) => t.estado === 'listo')) this.reload$.next();
  }

  getAvatarLabel(nombre: string): string {
    return getInitials(nombre);
  }

  enterContenedor(item: Contenedor): void {
    if (item.estado !== 'listo') return;
    if (isSuscripcionExpired(item.suscripcion_fecha_fin)) {
      if (item.propietario) this.renewContenedor(item.suscripcion_id);
      return;
    }
    this.tenant.setCurrent(item);
    this.router.navigateByUrl(this.tenantRoutes.tenantHome(item.schema_name));
  }

  renewContenedor(suscripcionId?: number): void {
    if (!this.capabilities().subscription) return;
    const base = this.env.cuentaUrl;
    if (!base) return;
    const path = suscripcionId ? `/suscripciones/planes/${suscripcionId}` : '/suscripciones';
    window.open(`${base}${path}`, '_blank', 'noopener');
  }

  openRowMenu(event: Event, item: Contenedor): void {
    event.stopPropagation();
    const caps = this.capabilities();
    const labels = this.t().contenedores.list.actions;
    const items: MenuItem[] = [];
    // Un contenedor que no se pudo crear no admite más que eliminarse.
    const fallido = item.estado === 'error';

    if (caps.invite && !fallido) {
      items.push({
        label: labels.invite,
        icon: 'pi pi-user-plus',
        command: () => this.inviteContenedor(item),
      });
    }
    if (caps.edit && !fallido) {
      items.push({
        label: labels.edit,
        icon: 'pi pi-pencil',
        command: () => this.editContenedor(item),
      });
    }
    if (caps.subscription && !fallido) {
      items.push({
        label: labels.updateSubscription,
        icon: 'pi pi-credit-card',
        command: () => this.renewContenedor(item.suscripcion_id),
      });
    }
    if (caps.delete) {
      if (items.length) items.push({ separator: true });
      items.push({
        label: labels.delete,
        icon: 'pi pi-trash',
        styleClass: 'cl-row-menu__danger',
        command: () => this.deleteContenedor(item),
      });
    }

    this.rowMenuItems = items;
    this.rowMenu.toggle(event);
  }

  inviteContenedor(item: Contenedor): void {
    this.contenedorToInvite.set(item);
    this.showInvite.set(true);
  }

  onInviteClose(visible: boolean): void {
    this.showInvite.set(visible);
    if (!visible) this.contenedorToInvite.set(null);
  }

  editContenedor(item: Contenedor): void {
    this.contenedorService
      .getContenedor(item.cliente_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((contenedor) => {
        this.contenedorToEdit.set(contenedor);
        this.showEdit.set(true);
      });
  }

  deleteContenedor(item: Contenedor): void {
    this.contenedorToDelete.set(item);
    this.showDelete.set(true);
  }

  onContenedorUpdated(): void {
    this.showEdit.set(false);
    this.contenedorToEdit.set(null);
    this.reload$.next();
  }

  onContenedorDeleted(): void {
    this.showDelete.set(false);
    this.contenedorToDelete.set(null);
    this.reload$.next();
  }

  onContenedorCreated(): void {
    this.showCreate.set(false);
    this.reload$.next();
  }
}
