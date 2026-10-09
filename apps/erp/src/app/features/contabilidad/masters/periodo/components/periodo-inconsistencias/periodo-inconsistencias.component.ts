import { Component, DestroyRef, type OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { I18nService, TenantService } from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { ModuleRegistryService } from '@erp/core/module-config';
import { PeriodoService } from '../../periodo.service';
import type { PeriodoInconsistencia } from '../../periodo.model';

/**
 * Contenido del diálogo "Ver inconsistencias" de un periodo. Recibe el id del
 * periodo, consulta el endpoint y pinta la tabla de problemas. Se monta y
 * destruye con la apertura/cierre del diálogo (la vista lo envuelve en `@if`), así
 * que la carga vive en `ngOnInit`.
 *
 * El tipo de documento enlaza a su ficha: la ruta sale del `DocumentEntityConfig`
 * cuyo `documentTypeId` coincide con el `documento_tipo_id` de la fila. Un tipo
 * sin config en el front se pinta como texto.
 */
@Component({
  selector: 'app-periodo-inconsistencias',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './periodo-inconsistencias.component.html',
})
export class PeriodoInconsistenciasComponent implements OnInit {
  private readonly service = inject(PeriodoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly registry = inject(ModuleRegistryService);
  private readonly tenant = inject(TenantService);

  protected readonly t = this.i18n.t;

  readonly periodoId = input.required<number>();

  protected readonly inconsistencias = signal<readonly PeriodoInconsistencia[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);

  /** `documento_tipo_id` → comandos de la ruta de detalle (sin el id del documento). */
  private readonly rutasDetalle = signal<ReadonlyMap<number, readonly string[]>>(new Map());

  ngOnInit(): void {
    this.service
      .inconsistencias(this.periodoId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (rows) => this.inconsistencias.set(rows),
        error: () => this.hasError.set(true),
      });

    void this.cargarRutasDetalle();
  }

  protected rutaDocumento(row: PeriodoInconsistencia): readonly (string | number)[] | null {
    if (row.documento_id === null || row.documento_tipo_id === null) return null;
    const base = this.rutasDetalle().get(row.documento_tipo_id);
    return base ? [...base, row.documento_id] : null;
  }

  private async cargarRutasDetalle(): Promise<void> {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    const modulos = await this.registry.loadAll();
    const rutas = new Map<number, readonly string[]>();
    for (const modulo of modulos) {
      for (const doc of modulo.documents) {
        rutas.set(doc.documentTypeId, [
          '/t',
          slug,
          modulo.id,
          ...doc.routes.detail.split('/').filter(Boolean),
        ]);
      }
    }
    this.rutasDetalle.set(rutas);
  }
}
