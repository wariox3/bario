import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { SucursalService } from '../../sucursal.service';
import { SUCURSAL_LIST_PATH } from '../../sucursal.constants';
import type { Sucursal } from '../../sucursal.model';

@Component({
  selector: 'app-sucursal-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent],
  templateUrl: './sucursal-detail.component.html',
  styleUrl: './sucursal-detail.component.scss',
})
export class SucursalDetailComponent implements OnInit {
  private readonly sucursalService = inject(SucursalService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly sucursal = signal<Sucursal | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Humano → listado de sucursales → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const sucursal = this.sucursal();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.sucursal.name,
        routerLink: slug ? ['/t', slug, ...SUCURSAL_LIST_PATH] : undefined,
      },
    ];
    if (sucursal) items.push({ label: sucursal.nombre });
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
    this.loadSucursal(id);
  }

  protected onBack(): void {
    this.navigate(...SUCURSAL_LIST_PATH);
  }

  protected onEdit(): void {
    const s = this.sucursal();
    if (!s) return;
    this.navigate(...SUCURSAL_LIST_PATH, 'editar', s.id);
  }

  private loadSucursal(id: number): void {
    this.sucursalService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.sucursal.set(s);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.sucursal.detail.toasts;
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
