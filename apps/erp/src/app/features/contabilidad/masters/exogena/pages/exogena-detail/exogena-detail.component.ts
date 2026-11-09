import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { I18nService, TenantService } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@erp/i18n';
import { ExogenaFormatosComponent } from '../../components/exogena-formatos/exogena-formatos.component';
import { EXOGENA_LIST_PATH } from '../../exogena.constants';
import type { Exogena } from '../../exogena.model';
import { ExogenaService } from '../../exogena.service';

@Component({
  selector: 'app-exogena-detail',
  standalone: true,
  imports: [ButtonGroupModule, ButtonModule, BreadcrumbComponent, ExogenaFormatosComponent],
  host: { class: 'flex flex-col gap-5' },
  templateUrl: './exogena-detail.component.html',
})
export class ExogenaDetailComponent implements OnInit {
  private readonly service = inject(ExogenaService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly exogena = signal<Exogena | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const exogena = this.exogena();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.contabilidad.name,
        routerLink: slug ? ['/t', slug, 'contabilidad'] : undefined,
      },
      {
        label: this.t().entities.exogena.name,
        routerLink: slug ? ['/t', slug, ...EXOGENA_LIST_PATH] : undefined,
      },
    ];
    if (exogena) items.push({ label: String(exogena.anio) });
    return items;
  });

  ngOnInit(): void {
    const id = Number(this.id());
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.load(id);
  }

  protected onBack(): void {
    this.navigateTo();
  }

  protected onNew(): void {
    this.navigateTo('nuevo');
  }

  protected onEdit(id: number): void {
    this.navigateTo('editar', id);
  }

  private load(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (exogena) => {
          this.exogena.set(exogena);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
        },
      });
  }

  private navigateTo(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...EXOGENA_LIST_PATH, ...subPath]);
  }
}
