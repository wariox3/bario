import { DatePipe } from '@angular/common';
import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService, FORMATO_FECHA } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@turnos/i18n';
import { PrototipoService } from '../../../../movimientos/programacion/prototipo.service';
import type { Prototipo } from '../../prototipo.model';
import { PROTOTIPO_LIST_PATH } from '../../prototipo.constants';

/**
 * Detalle (ficha) de un prototipo — solo lectura.
 *
 * Master del módulo Turno (camino B). Llega desde el listado (`detalle/:id`)
 * para ver la asignación del prototipo (documento/puesto de origen + contrato,
 * secuencia, fecha de inicio y posición). No permite editar: el prototipo se
 * gestiona desde el modal de la programación.
 */
@Component({
  selector: 'app-prototipo-detail',
  standalone: true,
  imports: [DatePipe, ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './prototipo-detail.component.html',
  styleUrl: './prototipo-detail.component.scss',
})
export class PrototipoDetailComponent implements OnInit {
  /** Formato de fecha del sistema, para el `| date` de la plantilla. */
  protected readonly formatoFecha = FORMATO_FECHA.angular;

  private readonly service = inject(PrototipoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del prototipo (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly prototipo = signal<Prototipo | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Título de la ficha: nombre del puesto, o `Prototipo #id` si no viene. */
  protected readonly titulo = computed(() => {
    const p = this.prototipo();
    if (!p) return '';
    return p.puesto_nombre ?? `${this.t().entities.prototipo.detail.eyebrow} #${p.id}`;
  });

  /** Migas: módulo Turno → listado de prototipos → título del prototipo. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const p = this.prototipo();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      {
        label: this.t().entities.prototipo.name,
        routerLink: slug ? ['/t', slug, ...PROTOTIPO_LIST_PATH] : undefined,
      },
    ];
    if (p) items.push({ label: this.titulo() });
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
    this.loadPrototipo(id);
  }

  protected onBack(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...PROTOTIPO_LIST_PATH]);
  }

  private loadPrototipo(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.prototipo.set(p);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.prototipo.detail.toasts;
          this.toast.error(toasts.loadError.title, toasts.loadError.desc);
        },
      });
  }
}
