import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@turnos/i18n';
import { PuestoService } from '../../puesto.service';
import { PUESTO_LIST_PATH } from '../../puesto.constants';
import type { Puesto } from '../../puesto.model';

/**
 * Detalle (ficha) de un puesto — solo lectura.
 *
 * Master del módulo Turno (camino B). Llega desde el listado (`detalle/:id`)
 * para ver de un vistazo la ubicación, coordenadas y relaciones del puesto.
 */
@Component({
  selector: 'app-puesto-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './puesto-detail.component.html',
  styleUrl: './puesto-detail.component.scss',
})
export class PuestoDetailComponent implements OnInit {
  private readonly puestoService = inject(PuestoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del puesto (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly puesto = signal<Puesto | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Turno → listado de puestos → nombre del puesto abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const puesto = this.puesto();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      {
        label: this.t().entities.puesto.name,
        routerLink: slug ? ['/t', slug, ...PUESTO_LIST_PATH] : undefined,
      },
    ];
    if (puesto) items.push({ label: puesto.nombre });
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
    this.loadPuesto(id);
  }

  protected onBack(): void {
    this.navigate(...PUESTO_LIST_PATH);
  }

  protected onEdit(): void {
    const p = this.puesto();
    if (!p) return;
    this.navigate(...PUESTO_LIST_PATH, 'editar', p.id);
  }

  private loadPuesto(id: number): void {
    this.puestoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.puesto.set(p);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.puesto.detail.toasts;
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
