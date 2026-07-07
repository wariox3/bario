import { Component, DestroyRef, type OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { I18nService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { PeriodoService } from '../../periodo.service';
import type { PeriodoInconsistencia } from '../../periodo.model';

/**
 * Contenido del diálogo "Ver inconsistencias" de un periodo. Recibe `anio`/`mes`,
 * consulta el endpoint y pinta la tabla de comprobantes con problemas. Se monta y
 * destruye con la apertura/cierre del diálogo (la vista lo envuelve en `@if`), así
 * que la carga vive en `ngOnInit`.
 */
@Component({
  selector: 'app-periodo-inconsistencias',
  standalone: true,
  templateUrl: './periodo-inconsistencias.component.html',
})
export class PeriodoInconsistenciasComponent implements OnInit {
  private readonly service = inject(PeriodoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly anio = input.required<number>();
  readonly mes = input.required<number>();

  protected readonly inconsistencias = signal<readonly PeriodoInconsistencia[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);

  ngOnInit(): void {
    this.service
      .inconsistencias(this.anio(), this.mes())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (rows) => this.inconsistencias.set(rows),
        error: () => this.hasError.set(true),
      });
  }
}
