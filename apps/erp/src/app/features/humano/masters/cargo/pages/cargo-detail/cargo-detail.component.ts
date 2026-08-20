import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { CargoService } from '../../cargo.service';
import { CARGO_LIST_PATH } from '../../cargo.constants';
import type { Cargo } from '../../cargo.model';

@Component({
  selector: 'app-cargo-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent],
  templateUrl: './cargo-detail.component.html',
  styleUrl: './cargo-detail.component.scss',
})
export class CargoDetailComponent implements OnInit {
  private readonly cargoService = inject(CargoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly cargo = signal<Cargo | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Humano → listado de cargos → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const cargo = this.cargo();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.cargo.name,
        routerLink: slug ? ['/t', slug, ...CARGO_LIST_PATH] : undefined,
      },
    ];
    if (cargo) items.push({ label: cargo.nombre });
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
    this.loadCargo(id);
  }

  protected onBack(): void {
    this.navigate(...CARGO_LIST_PATH);
  }

  protected onEdit(): void {
    const c = this.cargo();
    if (!c) return;
    this.navigate(...CARGO_LIST_PATH, 'editar', c.id);
  }

  private loadCargo(id: number): void {
    this.cargoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.cargo.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.cargo.detail.toasts;
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
