import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService, formatCop, fromIsoDate } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ContratoService } from '../../contrato.service';
import { CONTRATO_LIST_PATH } from '../../contrato.constants';
import type { Contrato } from '../../contrato.model';

/**
 * Ficha (detalle) de un contrato — solo lectura.
 *
 * Master del módulo Humano (camino B). Carga el contrato por `:id` con
 * `ContratoService.getById` y lo presenta en las mismas tres secciones que el
 * form (datos, remuneración, seguridad social), reutilizando las etiquetas de
 * `form.fields`. La identidad de la ficha es el empleado (`contacto_nombre`);
 * el estado (activo/terminado) se muestra como badge en el encabezado.
 */
@Component({
  selector: 'app-contrato-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './contrato-detail.component.html',
  styleUrl: './contrato-detail.component.scss',
})
export class ContratoDetailComponent implements OnInit {
  private readonly service = inject(ContratoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del contrato (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly contrato = signal<Contrato | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Humano → listado de contratos → empleado del contrato abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const contrato = this.contrato();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.contrato.name,
        routerLink: slug ? ['/t', slug, ...CONTRATO_LIST_PATH] : undefined,
      },
    ];
    if (contrato?.contacto_nombre) items.push({ label: contrato.contacto_nombre });
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
    this.loadContrato(id);
  }

  protected onBack(): void {
    this.navigate();
  }

  protected onEdit(): void {
    const c = this.contrato();
    if (!c) return;
    this.navigate('editar', c.id);
  }

  private loadContrato(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.contrato.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.contrato.detail.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }

  /** Monto a pesos colombianos sin decimales (`$ 1.000.000`); `—` si no hay valor. */
  protected formatMoney(value: string | number | null): string {
    const num = typeof value === 'string' ? Number(value) : value;
    if (num == null || !Number.isFinite(num)) return '—';
    return formatCop(num);
  }

  /** Fecha larga de la ficha (`20 de junio de 2026`); `—` si no hay valor. */
  protected formatFecha(value: string | null): string {
    const date = fromIsoDate(value);
    if (!date) return '—';
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  /** Navega dentro del tenant activo: `/t/<slug>/humano/contratos[/extra]`. */
  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, 'humano', 'contratos', ...subPath]);
  }
}
