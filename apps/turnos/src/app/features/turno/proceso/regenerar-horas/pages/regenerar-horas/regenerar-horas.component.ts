import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import {
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
  startOfToday,
} from '@reddoc/core';
import { ListShellComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@turnos/i18n';
import { RegenerarHorasService } from '../../regenerar-horas.service';
import { pickHorasCount, type RegenerarHorasResult } from '../../regenerar-horas.model';

/** Fase de la consola: gobierna botón, panel de resultado y feedback. */
type RegenerarStatus = 'idle' | 'running' | 'success' | 'error';

/**
 * Consola del proceso **Regenerar horas** (módulo Turno).
 *
 * Página de una sola acción dentro del shell de listas (`<lib-list-shell>`),
 * igual que "Regenerar afectado" de Venta, pero con un selector de **período**:
 * el operador elige mes/año, confirma (muta datos en masa) y dispara
 * `POST /general/documento-detalle/regenerar-horas/ { anio, mes }`. Al terminar
 * muestra el resultado con el conteo si el backend lo devuelve.
 */
@Component({
  selector: 'app-regenerar-horas',
  standalone: true,
  imports: [FormsModule, DatePickerModule, ButtonModule, ConfirmDialogModule, ListShellComponent],
  templateUrl: './regenerar-horas.component.html',
  styleUrl: './regenerar-horas.component.scss',
  providers: [ConfirmationService],
})
export class RegenerarHorasComponent {
  private readonly service = inject(RegenerarHorasService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly toast = inject(ToastService);
  private readonly tenant = inject(TenantService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  protected readonly status = signal<RegenerarStatus>('idle');
  protected readonly result = signal<RegenerarHorasResult | null>(null);

  /** Período (ancla mes/año) a recalcular; arranca en el mes actual. */
  protected readonly periodo = signal<Date | null>(startOfToday());

  /** Conteo mostrable extraído del response, o `null` si no vino ninguno. */
  protected readonly affectedCount = computed(() => pickHorasCount(this.result()));

  /** Migas: módulo Turno (navegable) → este proceso. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    return [
      {
        label: this.t().modules.turno.name,
        routerLink: slug ? ['/t', slug, 'inicio'] : undefined,
      },
      { label: this.t().entities.regenerarHoras.name },
    ];
  });

  protected onRegenerar(): void {
    if (this.status() === 'running' || !this.periodo()) return;

    const dict = this.t().entities.regenerarHoras;
    this.confirmation.confirm({
      header: dict.confirm.header,
      // No es destructivo (recálculo idempotente): ícono informativo, no de alerta.
      icon: 'pi pi-info-circle',
      message: dict.confirm.message,
      acceptLabel: dict.confirm.accept,
      rejectLabel: dict.confirm.cancel,
      acceptIcon: 'pi pi-sync',
      // Jerarquía visual: "Regenerar" primario (relleno) vs "Cancelar" quieto
      // (outlined secundario) — así los dos botones no salen del mismo color.
      rejectButtonStyleClass: 'p-button-outlined p-button-secondary',
      accept: () => this.execute(),
    });
  }

  private execute(): void {
    const periodo = this.periodo();
    if (!periodo) return;

    const dict = this.t().entities.regenerarHoras;
    this.status.set('running');

    this.service
      .regenerar(periodo.getFullYear(), periodo.getMonth() + 1)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.result.set(res);
          this.status.set('success');
          this.toast.success(dict.toasts.success.title, dict.toasts.success.desc);
        },
        error: (err: unknown) => {
          this.result.set(null);
          this.status.set('error');
          this.toast.error(
            dict.toasts.error.title,
            extractErrorMessage(err, dict.toasts.error.desc),
          );
        },
      });
  }
}
