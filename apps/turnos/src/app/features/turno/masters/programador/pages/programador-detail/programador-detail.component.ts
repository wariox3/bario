import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { I18nService, TenantService, ToastService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { DetailHeaderComponent } from '@reddoc/ui';
import type { AppDict } from '@turnos/i18n';
import { ProgramadorService } from '../../programador.service';
import { PROGRAMADOR_LIST_PATH } from '../../programador.constants';
import type { Programador } from '../../programador.model';

@Component({
  selector: 'app-programador-detail',
  standalone: true,
  imports: [ButtonModule, BreadcrumbComponent, DetailHeaderComponent],
  templateUrl: './programador-detail.component.html',
  styleUrl: './programador-detail.component.scss',
})
export class ProgramadorDetailComponent implements OnInit {
  private readonly programadorService = inject(ProgramadorService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly programador = signal<Programador | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  /** Migas: módulo Turno → listado de programadores → nombre del programador. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const programador = this.programador();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      {
        label: this.t().entities.programador.name,
        routerLink: slug ? ['/t', slug, ...PROGRAMADOR_LIST_PATH] : undefined,
      },
    ];
    if (programador) items.push({ label: programador.nombre });
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
    this.loadProgramador(id);
  }

  protected onBack(): void {
    this.navigate(...PROGRAMADOR_LIST_PATH);
  }

  protected onEdit(): void {
    const p = this.programador();
    if (!p) return;
    this.navigate(...PROGRAMADOR_LIST_PATH, 'editar', p.id);
  }

  private loadProgramador(id: number): void {
    this.programadorService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.programador.set(p);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.programador.detail.toasts;
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
