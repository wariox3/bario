import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import {
  I18nService,
  TenantService,
  ToastService,
  formatCop,
  formatFechaCorta,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { NovedadService } from '../../novedad.service';
import { NOVEDAD_LIST_PATH } from '../../novedad.constants';
import type { Novedad } from '../../novedad.model';
import { esVacaciones } from '../../novedad.rules';

/** Días y horas llegan como Decimal (string) con hasta 3 decimales; se pintan sin ceros de relleno. */
const cantidadFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/**
 * Ficha de una novedad: lo que el formulario no muestra porque lo calcula el
 * backend (base de cotización, reparto empresa/entidad, pagos de vacaciones).
 *
 * Como en el ERP anterior, la ficha cambia con el tipo: las vacaciones se leen
 * por días y pagos de disfrute/dinero; el resto (incapacidades, licencias) por
 * lo que asume la empresa y lo que reconoce la entidad.
 */
@Component({
  selector: 'app-novedad-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent],
  templateUrl: './novedad-detail.component.html',
  styleUrl: './novedad-detail.component.scss',
})
export class NovedadDetailComponent implements OnInit {
  private readonly novedadService = inject(NovedadService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly novedad = signal<Novedad | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Misma regla que el formulario: decide cuál de las dos fichas se pinta. */
  protected readonly esVacaciones = computed(() =>
    esVacaciones(this.novedad()?.novedad_tipo ?? null),
  );

  /** Fecha ISO a `dd/mm/yyyy`, la convención del ERP. */
  protected fecha(iso: string | null | undefined): string {
    return formatFechaCorta(iso);
  }

  /** Importe en pesos. `formatCop` resuelve el nulo y el valor como string. */
  protected cop(valor: string | number | null | undefined): string {
    return valor != null ? formatCop(valor) : '';
  }

  /** Días u horas (Decimal del backend) con hasta dos decimales. */
  protected cantidad(valor: string | number | null | undefined): string {
    if (valor == null || valor === '') return '';
    const n = Number(valor);
    return Number.isFinite(n) ? cantidadFormatter.format(n) : '';
  }

  /** Migas: módulo Humano → listado de novedades → empleado de la novedad abierta. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const novedad = this.novedad();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.novedad.name,
        routerLink: slug ? ['/t', slug, ...NOVEDAD_LIST_PATH] : undefined,
      },
    ];
    if (novedad) items.push({ label: novedad.contrato_nombre || `#${novedad.id}` });
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
    this.loadNovedad(id);
  }

  protected onBack(): void {
    this.navigate(...NOVEDAD_LIST_PATH);
  }

  protected onEdit(): void {
    const n = this.novedad();
    if (!n) return;
    this.navigate(...NOVEDAD_LIST_PATH, 'editar', n.id);
  }

  private loadNovedad(id: number): void {
    this.novedadService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          this.novedad.set(n);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.novedad.detail.toasts;
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
