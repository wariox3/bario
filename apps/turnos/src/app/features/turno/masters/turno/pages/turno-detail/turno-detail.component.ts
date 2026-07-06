import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@turnos/i18n';
import { TurnoService } from '../../turno.service';
import { TURNO_LIST_PATH } from '../../turno.constants';
import type { Turno } from '../../turno.model';

/**
 * Detalle (ficha) de un turno (jornada) — solo lectura.
 *
 * Master del módulo Turno (camino B). Llega desde el listado (`detalle/:id`)
 * para ver el horario, las horas calculadas y el color identificador.
 */
@Component({
  selector: 'app-turno-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './turno-detail.component.html',
  styleUrl: './turno-detail.component.scss',
})
export class TurnoDetailComponent implements OnInit {
  private readonly turnoService = inject(TurnoService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del turno (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly turno = signal<Turno | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Turno → listado de turnos → nombre del turno abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const turno = this.turno();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      {
        label: this.t().entities.turno.name,
        routerLink: slug ? ['/t', slug, ...TURNO_LIST_PATH] : undefined,
      },
    ];
    if (turno) items.push({ label: turno.nombre });
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
    this.loadTurno(id);
  }

  protected onBack(): void {
    this.navigate(...TURNO_LIST_PATH);
  }

  protected onEdit(): void {
    const turno = this.turno();
    if (!turno) return;
    this.navigate(...TURNO_LIST_PATH, 'editar', turno.id);
  }

  private loadTurno(id: number): void {
    this.turnoService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turno) => {
          this.turno.set(turno);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.turno.detail.toasts;
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
