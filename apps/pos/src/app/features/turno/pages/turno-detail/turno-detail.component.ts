import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { I18nService, ToastService, extractBlobErrorMessage } from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import type { AppDict } from '@pos/i18n';
import {
  cuadreDe,
  duracion,
  formatDiferencia,
  formatFechaHora,
  formatPesos,
} from '../../turno.format';
import type { TurnoConDetalles, TurnoResumen } from '../../turno.model';
import { turnoNav } from '../../turno.nav';
import { TurnoService } from '../../turno.service';

/** Una fila del arqueo ya formateada; sin contado mientras el turno sigue abierto. */
interface FilaArqueo {
  readonly id: number;
  readonly cuenta: string;
  readonly esperado: string;
  readonly contado: string;
  readonly diferencia: string;
  readonly cuadre: ReturnType<typeof cuadreDe> | null;
}

/**
 * Ficha de un turno, de cualquier cajero. Arriba sus datos en tres grupos
 * (dónde, cuándo, cuánto); abajo el arqueo: esperado, contado y diferencia por
 * cuenta si ya se cerró, o solo lo esperado (de `resumen/`) si sigue abierto.
 * Imprime el cierre, o el pre-cierre con el turno abierto.
 */
@Component({
  selector: 'app-turno-detail',
  standalone: true,
  host: { class: 'flex flex-col gap-5' },
  imports: [ButtonModule, BreadcrumbComponent],
  templateUrl: './turno-detail.component.html',
})
export class TurnoDetailComponent implements OnInit {
  private readonly service = inject(TurnoService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);
  private readonly nav = turnoNav();

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly turno = signal<TurnoConDetalles | null>(null);
  /** Lo esperado de un turno abierto; uno cerrado lo trae en sus `detalles`. */
  private readonly resumen = signal<TurnoResumen | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);
  protected readonly imprimiendo = signal(false);

  protected readonly titulo = computed(() =>
    this.t().turno.detalle.title.replace('{id}', String(this.turno()?.id ?? '')),
  );

  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() =>
    this.nav.crumbs(this.t().layout.nav.turno, ...(this.turno() ? [{ label: this.titulo() }] : [])),
  );

  protected readonly datos = computed(() => {
    const t = this.turno();
    if (!t) return null;
    const r = this.resumen();
    // Abierto, lo vendido sale del resumen: el turno lo consolida al cerrar.
    const cantidad = t.estado_cerrado ? t.cantidad_documentos : (r?.cantidad_documentos ?? null);
    const total = t.estado_cerrado ? t.total_venta : (r?.total_venta ?? null);
    return {
      apertura: formatFechaHora(t.fecha_apertura),
      cierre: formatFechaHora(t.fecha_cierre),
      duracion: duracion(
        t.fecha_apertura,
        t.fecha_cierre ? new Date(t.fecha_cierre).getTime() : Date.now(),
      ),
      base: formatPesos(t.base),
      ventas: cantidad === null ? '' : cantidad.toLocaleString('es-CO'),
      total: total === null ? '' : formatPesos(total),
    };
  });

  protected readonly filas = computed<readonly FilaArqueo[]>(() => {
    const t = this.turno();
    if (!t) return [];
    if (t.estado_cerrado) {
      return t.detalles.map((d) => ({
        id: d.cuenta_banco,
        cuenta: d.cuenta_banco_nombre ?? '',
        esperado: formatPesos(d.esperado),
        contado: formatPesos(d.contado),
        diferencia: formatDiferencia(d.diferencia),
        cuadre: cuadreDe(Number(d.diferencia)),
      }));
    }
    return (this.resumen()?.cuentas ?? []).map((c) => ({
      id: c.cuenta_banco,
      cuenta: c.cuenta_banco_nombre,
      esperado: formatPesos(c.esperado),
      contado: '',
      diferencia: '',
      cuadre: null,
    }));
  });

  protected readonly totales = computed(() => {
    const t = this.turno();
    if (!t) return null;
    const sumar = (valores: readonly (string | number)[]) =>
      Math.round(valores.reduce<number>((s, v) => s + Number(v), 0) * 100) / 100;
    if (t.estado_cerrado) {
      const diferencia = sumar(t.detalles.map((d) => d.diferencia));
      return {
        esperado: formatPesos(sumar(t.detalles.map((d) => d.esperado))),
        contado: formatPesos(sumar(t.detalles.map((d) => d.contado))),
        diferencia: formatDiferencia(diferencia),
        cuadre: cuadreDe(diferencia),
      };
    }
    return {
      esperado: formatPesos(sumar((this.resumen()?.cuentas ?? []).map((c) => c.esperado))),
      contado: '',
      diferencia: '',
      cuadre: null,
    };
  });

  ngOnInit(): void {
    const id = Number(this.id());
    if (!Number.isFinite(id)) {
      this.isLoading.set(false);
      this.notFound.set(true);
      return;
    }
    this.cargar(id);
  }

  protected onBack(): void {
    this.nav.ir();
  }

  protected imprimir(): void {
    const t = this.turno();
    if (!t || this.imprimiendo()) return;
    this.imprimiendo.set(true);
    this.service
      .imprimir(t.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.imprimiendo.set(false)),
      )
      .subscribe({
        error: (err: unknown) => {
          const tx = this.t().turno.toasts.imprimirError;
          void extractBlobErrorMessage(err, tx.desc).then((mensaje) =>
            this.toast.error(tx.title, mensaje),
          );
        },
      });
  }

  private cargar(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (turno) => {
          this.turno.set(turno);
          this.isLoading.set(false);
          if (!turno.estado_cerrado) this.cargarResumen(turno.id);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const tx = this.t().turno.detalle.toasts.loadError;
          this.toast.error(tx.title, tx.desc);
        },
      });
  }

  /** Si falla, el arqueo queda vacío: la ficha del turno se puede leer igual. */
  private cargarResumen(id: number): void {
    this.service
      .resumen(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (resumen) => this.resumen.set(resumen) });
  }
}
