import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { AlmacenService } from '../../almacen.service';
import { ALMACEN_LIST_PATH } from '../../almacen.constants';
import type { Almacen } from '../../almacen.model';

/** Ficha de un **almacén**. Un nombre: no hay más que mostrar. */
@Component({
  selector: 'app-almacen-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './almacen-detail.component.html',
  styleUrl: './almacen-detail.component.scss',
})
export class AlmacenDetailComponent implements OnInit {
  private readonly service = inject(AlmacenService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly almacen = signal<Almacen | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Inventario → listado de almacenes → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const almacen = this.almacen();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.inventario.name,
        routerLink: slug ? ['/t', slug, 'inventario'] : undefined,
      },
      {
        label: this.t().entities.almacen.name,
        routerLink: slug ? ['/t', slug, ...ALMACEN_LIST_PATH] : undefined,
      },
    ];
    if (almacen) items.push({ label: almacen.nombre });
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
    this.loadAlmacen(id);
  }

  protected onBack(): void {
    this.navigate(...ALMACEN_LIST_PATH);
  }

  protected onEdit(): void {
    const a = this.almacen();
    if (!a) return;
    this.navigate(...ALMACEN_LIST_PATH, 'editar', a.id);
  }

  private loadAlmacen(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (a) => {
          this.almacen.set(a);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.almacen.detail.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }

  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...subPath]);
  }
}
