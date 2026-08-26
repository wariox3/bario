import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { I18nService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { masterNav } from '@erp/core/erp-modules';
import { SedeService } from '../../sede.service';
import { SEDE_SEGMENT } from '../../sede.constants';
import type { Sede } from '../../sede.model';

@Component({
  selector: 'app-sede-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent],
  templateUrl: './sede-detail.component.html',
  styleUrl: './sede-detail.component.scss',
})
export class SedeDetailComponent implements OnInit {
  private readonly service = inject(SedeService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  private readonly nav = masterNav(SEDE_SEGMENT);

  readonly id = input<string>();

  protected readonly sede = signal<Sede | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo activo → listado de sedes → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const sede = this.sede();
    return this.nav.crumbs(this.t().entities.sede.name, ...(sede ? [{ label: sede.nombre }] : []));
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadSede(id);
  }

  protected onBack(): void {
    this.nav.ir();
  }

  protected onEdit(): void {
    const s = this.sede();
    if (!s) return;
    this.nav.ir('editar', s.id);
  }

  private loadSede(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.sede.set(s);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.sede.detail.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }
}
