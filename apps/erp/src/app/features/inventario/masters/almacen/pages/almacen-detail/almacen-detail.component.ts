import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { I18nService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { masterNav } from '@erp/core/erp-modules';
import { AlmacenService } from '../../almacen.service';
import { ALMACEN_SEGMENT } from '../../almacen.constants';
import type { Almacen } from '../../almacen.model';

/** Ficha de un **almacén**. Un nombre: no hay más que mostrar. */
@Component({
  selector: 'app-almacen-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent],
  templateUrl: './almacen-detail.component.html',
  styleUrl: './almacen-detail.component.scss',
})
export class AlmacenDetailComponent implements OnInit {
  private readonly service = inject(AlmacenService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  private readonly nav = masterNav(ALMACEN_SEGMENT);

  readonly id = input<string>();

  protected readonly almacen = signal<Almacen | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo activo → listado de almacenes → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const almacen = this.almacen();
    return this.nav.crumbs(
      this.t().entities.almacen.name,
      ...(almacen ? [{ label: almacen.nombre }] : []),
    );
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
    this.nav.ir();
  }

  protected onEdit(): void {
    const a = this.almacen();
    if (!a) return;
    this.nav.ir('editar', a.id);
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
}
