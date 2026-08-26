import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { CentroCostoService } from '../../centro-costo.service';
import { CENTRO_COSTO_LIST_PATH } from '../../centro-costo.constants';
import type { CentroCosto } from '../../centro-costo.model';

@Component({
  selector: 'app-centro-costo-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent],
  templateUrl: './centro-costo-detail.component.html',
  styleUrl: './centro-costo-detail.component.scss',
})
export class CentroCostoDetailComponent implements OnInit {
  private readonly centroCostoService = inject(CentroCostoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly centroCosto = signal<CentroCosto | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Contabilidad → listado de centros de costo → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const centroCosto = this.centroCosto();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      {
        label: this.t().entities.centroCosto.name,
        routerLink: slug ? ['/t', slug, ...CENTRO_COSTO_LIST_PATH] : undefined,
      },
    ];
    if (centroCosto) items.push({ label: centroCosto.nombre });
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
    this.loadCentroCosto(id);
  }

  protected onBack(): void {
    this.navigate(...CENTRO_COSTO_LIST_PATH);
  }

  protected onEdit(): void {
    const c = this.centroCosto();
    if (!c) return;
    this.navigate(...CENTRO_COSTO_LIST_PATH, 'editar', c.id);
  }

  private loadCentroCosto(id: number): void {
    this.centroCostoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.centroCosto.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.centroCosto.detail.toasts;
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
