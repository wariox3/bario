import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule, type PaginatorState } from 'primeng/paginator';
import { finalize } from 'rxjs';
import {
  I18nService,
  LIST_PAGE_SIZE,
  ToastService,
  formatCop,
  formatFechaCorta,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import type { ExogenaFormato } from '../../exogena.model';
import { ExogenaService } from '../../exogena.service';

/** Fila de la tabla: el formato con sus valores ya formateados. */
interface FormatoFila {
  readonly id: number;
  readonly nombre: string;
  readonly cuantiaMenor: string;
  readonly registros: number;
  readonly total: string;
  readonly fechaGeneracion: string;
  readonly presentado: boolean;
}

/**
 * Formatos de la exógena de un año, dentro de su ficha. Se carga sola y pagina de
 * a 25. Trae también «Cargar formatos», que suma los del catálogo que falten.
 */
@Component({
  selector: 'app-exogena-formatos',
  standalone: true,
  imports: [ButtonModule, PaginatorModule],
  templateUrl: './exogena-formatos.component.html',
})
export class ExogenaFormatosComponent implements OnInit {
  private readonly service = inject(ExogenaService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly exogenaId = input.required<number>();

  protected readonly pageSize = LIST_PAGE_SIZE;
  protected readonly page = signal(0);
  protected readonly totalFormatos = signal(0);
  protected readonly formatos = signal<readonly ExogenaFormato[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly isCargando = signal(false);

  protected readonly filas = computed<readonly FormatoFila[]>(() =>
    this.formatos().map((f) => ({
      id: f.id,
      nombre: f.formato_nombre ?? '',
      cuantiaMenor: formatCop(f.cuantia_menor),
      registros: f.registros,
      total: formatCop(f.total),
      fechaGeneracion: formatFechaCorta(f.fecha_generacion, ''),
      presentado: f.estado_presentado,
    })),
  );

  ngOnInit(): void {
    this.load();
  }

  protected onPageChange(event: PaginatorState): void {
    this.page.set(event.page ?? 0);
    this.load();
  }

  protected cargarFormatos(): void {
    if (this.isCargando()) return;
    this.isCargando.set(true);
    this.service
      .cargarFormatos(this.exogenaId())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isCargando.set(false)),
      )
      .subscribe({
        // El error ya lo avisa el interceptor.
        next: ({ creados }) => {
          this.avisarCarga(creados);
          this.page.set(0);
          this.load();
        },
      });
  }

  private avisarCarga(creados: number): void {
    const toasts = this.t().entities.exogena.formatos.toasts;
    if (creados === 0) {
      this.toast.success(toasts.sinNuevos.title, toasts.sinNuevos.desc);
      return;
    }
    const desc = creados === 1 ? toasts.cargados.one : toasts.cargados.other;
    this.toast.success(toasts.cargados.title, desc.replace('{n}', String(creados)));
  }

  private load(): void {
    this.isLoading.set(true);
    this.hasError.set(false);
    this.service
      .listarFormatos(this.exogenaId(), this.page())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.formatos.set(res.results);
          this.totalFormatos.set(res.count);
        },
        error: () => this.hasError.set(true),
      });
  }
}
