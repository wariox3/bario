import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@turnos/i18n';
import { SecuenciaService } from '../../secuencia.service';
import {
  SECUENCIA_LIST_PATH,
  SECUENCIA_MONTH_DAYS,
  SECUENCIA_WEEKDAYS,
} from '../../secuencia.constants';
import type { Secuencia } from '../../secuencia.model';

/**
 * Detalle (ficha) de una secuencia — solo lectura.
 *
 * Master del módulo Turno (camino B). Llega desde el listado (`detalle/:id`)
 * para ver el patrón completo: totales, código de turno por día del mes y por
 * día de semana/festivos.
 */
@Component({
  selector: 'app-secuencia-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './secuencia-detail.component.html',
  styleUrl: './secuencia-detail.component.scss',
})
export class SecuenciaDetailComponent implements OnInit {
  private readonly secuenciaService = inject(SecuenciaService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id de la secuencia (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly secuencia = signal<Secuencia | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Turno → listado de secuencias → nombre de la secuencia. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const secuencia = this.secuencia();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      {
        label: this.t().entities.secuencia.name,
        routerLink: slug ? ['/t', slug, ...SECUENCIA_LIST_PATH] : undefined,
      },
    ];
    if (secuencia) items.push({ label: secuencia.nombre });
    return items;
  });

  /**
   * Celdas de los 31 días del mes (siempre completas). Los días sin turno
   * asignado quedan con `value` nulo y el template los pinta como vacíos.
   */
  protected readonly monthDayCells = computed(() => {
    const s = this.secuencia();
    if (!s) return [];
    return SECUENCIA_MONTH_DAYS.map((d) => ({
      day: d,
      value: (s[`dia_${d}` as keyof Secuencia] as string | null) || null,
    }));
  });

  /** Celdas de los días de semana/festivos (siempre completas). */
  protected readonly weekdayCells = computed(() => {
    const s = this.secuencia();
    if (!s) return [];
    return SECUENCIA_WEEKDAYS.map((w) => ({
      labelKey: w.labelKey,
      value: (s[w.control as keyof Secuencia] as string | null) || null,
    }));
  });

  ngOnInit(): void {
    const rawId = this.id();
    const id = rawId != null ? Number(rawId) : NaN;
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadSecuencia(id);
  }

  protected onBack(): void {
    this.navigate(...SECUENCIA_LIST_PATH);
  }

  protected onEdit(): void {
    const s = this.secuencia();
    if (!s) return;
    this.navigate(...SECUENCIA_LIST_PATH, 'editar', s.id);
  }

  /**
   * Resuelve una clave i18n con notación de punto contra el diccionario activo.
   * Se usa para los labels de los días de semana (`labelKey` de SECUENCIA_WEEKDAYS).
   */
  protected translate(key: string): string {
    let current: unknown = this.t();
    for (const part of key.split('.')) {
      if (current === null || typeof current !== 'object') return key;
      current = (current as Record<string, unknown>)[part];
    }
    return typeof current === 'string' ? current : key;
  }

  private loadSecuencia(id: number): void {
    this.secuenciaService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.secuencia.set(s);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.secuencia.detail.toasts;
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
