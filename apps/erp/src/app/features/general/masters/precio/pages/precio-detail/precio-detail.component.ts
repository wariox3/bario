import {
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { I18nService, TenantService, ToastService, FORMATO_FECHA } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { PrecioItemsComponent } from '../../components/precio-items/precio-items.component';
import { ActiveModuleStore, currentModuleId, resolveModuleName } from '@erp/core/erp-modules';
import type { AppDict } from '@erp/i18n';
import { PrecioService } from '../../precio.service';
import { PRECIO_LIST_PATH } from '../../precio.constants';
import type { Precio } from '../../precio.model';

@Component({
  selector: 'app-precio-detail',
  standalone: true,
  imports: [ButtonModule, MenuModule, BreadcrumbComponent, DatePipe, PrecioItemsComponent],
  templateUrl: './precio-detail.component.html',
  styleUrl: './precio-detail.component.scss',
})
export class PrecioDetailComponent implements OnInit {
  /** Formato de fecha del sistema, para el `| date` de la plantilla. */
  protected readonly formatoFecha = FORMATO_FECHA.angular;

  private readonly precioService = inject(PrecioService);
  private readonly tenant = inject(TenantService);
  private readonly activeModule = inject(ActiveModuleStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly precio = signal<Precio | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  private readonly items = viewChild<PrecioItemsComponent>('items');
  private readonly opcionesMenu = viewChild.required<Menu>('opcionesMenu');

  /**
   * Entradas del menú "Opciones". `computed` para que la referencia sea estable
   * entre change detections: con un modelo nuevo en cada CD, `p-menu` pierde el
   * primer click. Solo cambia al cambiar de idioma.
   */
  protected readonly opcionesItems = computed<MenuItem[]>(() => [
    {
      label: this.t().entities.precio.items.import.title,
      icon: 'pi pi-upload',
      command: () => this.items()?.abrirImportar(),
    },
  ]);

  /** Migas: módulo General → listado de precios → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const precio = this.precio();
    const moduleId = currentModuleId(this.activeModule);
    const items: BreadcrumbItem[] = [
      {
        label: resolveModuleName(this.activeModule, this.t()),
        routerLink: slug ? ['/t', slug, moduleId] : undefined,
      },
      {
        label: this.t().entities.precio.name,
        routerLink: slug ? ['/t', slug, moduleId, ...PRECIO_LIST_PATH] : undefined,
      },
    ];
    if (precio) items.push({ label: precio.nombre });
    return items;
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadPrecio(id);
  }

  protected toggleOpciones(event: Event): void {
    this.opcionesMenu().toggle(event);
  }

  protected onBack(): void {
    this.navigate(...PRECIO_LIST_PATH);
  }

  protected onEdit(): void {
    const p = this.precio();
    if (!p) return;
    this.navigate(...PRECIO_LIST_PATH, 'editar', p.id);
  }

  private loadPrecio(id: number): void {
    this.precioService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.precio.set(p);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.precio.detail.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, currentModuleId(this.activeModule), ...subPath]);
  }
}
