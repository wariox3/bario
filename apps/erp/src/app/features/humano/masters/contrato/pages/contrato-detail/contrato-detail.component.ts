import {
  Component,
  DestroyRef,
  type OnInit,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, filter, finalize, from, switchMap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { Menu, MenuModule } from 'primeng/menu';
import type { MenuItem } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import {
  FileDownloadService,
  I18nService,
  TenantService,
  ToastService,
  formatCop,
  formatFechaCorta,
  formatFechaLarga,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import type { AppDict } from '@erp/i18n';
import { ContratoService } from '../../contrato.service';
import {
  CERTIFICADO_LABORAL_ENDPOINT,
  CERTIFICADO_LABORAL_FILENAME,
  CONTRATO_LIST_PATH,
} from '../../contrato.constants';
import type { Contrato } from '../../contrato.model';

/** Una de las cuatro fechas de último pago: su etiqueta i18n y el valor ya formateado. */
interface ParametroInicial {
  readonly labelKey: 'general' | 'prima' | 'cesantia' | 'vacacion';
  readonly value: string;
}

/**
 * Ficha (detalle) de un contrato — solo lectura.
 *
 * Master del módulo Humano (camino B). Carga el contrato por `:id` con
 * `ContratoService.getById` y lo presenta en las mismas tres secciones que el
 * form (datos, remuneración, seguridad social), reutilizando las etiquetas de
 * `form.fields`. La identidad de la ficha es el empleado (`contacto_nombre`);
 * el estado (activo/terminado) se muestra como badge en el encabezado.
 */
@Component({
  selector: 'app-contrato-detail',
  standalone: true,
  imports: [ButtonModule, MenuModule, BreadcrumbComponent],
  providers: [DialogService],
  templateUrl: './contrato-detail.component.html',
  styleUrl: './contrato-detail.component.scss',
})
export class ContratoDetailComponent implements OnInit {
  private readonly service = inject(ContratoService);
  private readonly dialog = inject(DialogService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** Id del contrato (route param `:id`, vía `withComponentInputBinding`). */
  readonly id = input<string>();

  protected readonly contrato = signal<Contrato | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);

  private readonly formatoMenu = viewChild<Menu>('formatoMenu');
  private readonly utilidadesMenu = viewChild<Menu>('utilidadesMenu');

  /**
   * Entradas del dropdown "Utilidades" — lo que se corrige sobre un contrato
   * vigente. `computed` por la misma razón que "Formato": recrear el array en
   * cada detección de cambios le hace perder el primer click a `p-menu`.
   */
  protected readonly utilidadesItems = computed<MenuItem[]>(() => [
    {
      label: this.t().entities.contrato.parametrosIniciales.action,
      icon: 'pi pi-calendar-clock',
      command: () => this.onParametrosIniciales(),
    },
  ]);

  /**
   * Las cuatro fechas de último pago, ya formateadas, para pintarlas en la ficha.
   * Antes solo se veían abriendo el modal que las edita.
   */
  protected readonly parametrosIniciales = computed<readonly ParametroInicial[]>(() => {
    const c = this.contrato();
    if (!c) return [];
    return [
      { labelKey: 'general', value: formatFechaCorta(c.fecha_ultimo_pago) },
      { labelKey: 'prima', value: formatFechaCorta(c.fecha_ultimo_pago_prima) },
      { labelKey: 'cesantia', value: formatFechaCorta(c.fecha_ultimo_pago_cesantia) },
      { labelKey: 'vacacion', value: formatFechaCorta(c.fecha_ultimo_pago_vacacion) },
    ];
  });

  /** Descarga en vuelo: evita disparar dos veces el mismo PDF. */
  protected readonly isDescargando = signal(false);

  /**
   * Entradas del dropdown "Formato" — los documentos imprimibles del contrato.
   * `computed` (ref estable salvo cambio de idioma) para que `p-menu` no pierda
   * el primer click al recrear el array en cada detección de cambios.
   */
  protected readonly formatoItems = computed<MenuItem[]>(() => [
    {
      label: this.t().entities.contrato.formato.certificadoLaboral,
      icon: 'pi pi-file-pdf',
      command: () => this.onCertificadoLaboral(),
    },
  ]);

  /** Migas: módulo Humano → listado de contratos → empleado del contrato abierto. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const contrato = this.contrato();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.contrato.name,
        routerLink: slug ? ['/t', slug, ...CONTRATO_LIST_PATH] : undefined,
      },
    ];
    if (contrato?.contacto_nombre) items.push({ label: contrato.contacto_nombre });
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
    this.loadContrato(id);
  }

  protected onBack(): void {
    this.navigate();
  }

  protected onEdit(): void {
    const c = this.contrato();
    if (!c) return;
    this.navigate('editar', c.id);
  }

  // ── Formatos ──────────────────────────────────────────────────────────────

  protected toggleFormato(event: Event): void {
    this.formatoMenu()?.toggle(event);
  }

  protected toggleUtilidades(event: Event): void {
    this.utilidadesMenu()?.toggle(event);
  }

  /**
   * Descarga el certificado laboral del empleado.
   *
   * Va **sin** condicionar al estado del contrato: certificar dónde y cuándo
   * trabajó alguien es justamente lo que se pide de un contrato ya terminado.
   */
  protected onCertificadoLaboral(): void {
    const c = this.contrato();
    if (!c || this.isDescargando()) return;

    this.isDescargando.set(true);
    this.fileDownload
      .download(CERTIFICADO_LABORAL_ENDPOINT, {
        method: 'POST',
        body: { id: c.id },
        fallbackFilename: CERTIFICADO_LABORAL_FILENAME,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isDescargando.set(false)),
      )
      .subscribe({
        error: () => {
          const ts = this.t().entities.contrato.formato.toasts.error;
          this.toast.error(ts.title, ts.desc);
        },
      });
  }

  // ── Terminación ───────────────────────────────────────────────────────────

  /**
   * Abre el modal de terminación (lazy: solo se usa al cerrar un contrato).
   *
   * Terminar **crea la liquidación** del empleado en el backend, así que al
   * volver se recarga la ficha para ver el contrato ya cerrado.
   */
  protected onTerminar(): void {
    const c = this.contrato();
    if (!c) return;

    from(import('../../components/terminar-contrato-modal/terminar-contrato-modal.component'))
      .pipe(
        switchMap(({ TerminarContratoModalComponent }) => {
          const ref = this.dialog.open(TerminarContratoModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '40rem',
            data: { contratoId: c.id, empleado: c.contacto_nombre, fechaHasta: c.fecha_hasta },
          });
          return ref ? ref.onClose : EMPTY;
        }),
        filter((termino: unknown): termino is true => termino === true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.loadContrato(c.id));
  }

  /** Abre las cuatro fechas de último pago, con las que arranca la liquidación. */
  protected onParametrosIniciales(): void {
    const c = this.contrato();
    if (!c) return;

    from(import('../../components/parametros-iniciales-modal/parametros-iniciales-modal.component'))
      .pipe(
        switchMap(({ ParametrosInicialesModalComponent }) => {
          const ref = this.dialog.open(ParametrosInicialesModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '44rem',
            data: {
              contratoId: c.id,
              empleado: c.contacto_nombre,
              fechaUltimoPago: c.fecha_ultimo_pago,
              fechaUltimoPagoPrima: c.fecha_ultimo_pago_prima,
              fechaUltimoPagoCesantia: c.fecha_ultimo_pago_cesantia,
              fechaUltimoPagoVacacion: c.fecha_ultimo_pago_vacacion,
            },
          });
          return ref ? ref.onClose : EMPTY;
        }),
        filter((guardo: unknown): guardo is true => guardo === true),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.loadContrato(c.id));
  }

  private loadContrato(id: number): void {
    this.service
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => {
          this.contrato.set(c);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.contrato.detail.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }

  /** Monto a pesos colombianos sin decimales (`$ 1.000.000`); `—` si no hay valor. */
  protected formatMoney(value: string | number | null): string {
    const num = typeof value === 'string' ? Number(value) : value;
    if (num == null || !Number.isFinite(num)) return '—';
    return formatCop(num);
  }

  /** Fecha larga de la ficha (`20 de junio de 2026`); `—` si no hay valor. */
  protected formatFecha(value: string | null): string {
    return formatFechaLarga(value, '—');
  }

  /** Navega dentro del tenant activo: `/t/<slug>/humano/contratos[/extra]`. */
  private navigate(...subPath: (string | number)[]): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, 'humano', 'contratos', ...subPath]);
  }
}
