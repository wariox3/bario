import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { I18nService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@pos/i18n';
import type { Caja } from '../../caja.model';
import { cajaNav } from '../../caja.nav';
import { CajaService } from '../../caja.service';

/** Ficha de una caja: sus datos en un solo grupo, con volver, nuevo y editar. */
@Component({
  selector: 'app-caja-detail',
  standalone: true,
  host: { class: 'flex flex-col gap-5' },
  imports: [ButtonModule, ButtonGroupModule, BreadcrumbComponent],
  templateUrl: './caja-detail.component.html',
})
export class CajaDetailComponent implements OnInit {
  private readonly service = inject(CajaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly nav = cajaNav();

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly caja = signal<Caja | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: listado de cajas → nombre abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const caja = this.caja();
    return this.nav.crumbs(this.t().layout.nav.caja, ...(caja ? [{ label: caja.nombre }] : []));
  });

  ngOnInit(): void {
    const id = Number(this.id());
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.cargar(id);
  }

  protected onBack(): void {
    this.nav.ir();
  }

  protected onNew(): void {
    this.nav.ir('nuevo');
  }

  protected onEdit(): void {
    const caja = this.caja();
    if (caja) this.nav.ir('editar', caja.id);
  }

  private cargar(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (caja) => {
          this.caja.set(caja);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const tx = this.t().cajas.detail.toasts.loadError;
          this.toast.error(tx.title, tx.desc);
        },
      });
  }
}
