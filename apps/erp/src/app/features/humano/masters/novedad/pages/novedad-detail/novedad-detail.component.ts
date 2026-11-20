import { Component, DestroyRef, type OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { EMPTY, filter, finalize, from, switchMap } from 'rxjs';
import { ConfirmationService, type MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ButtonGroupModule } from 'primeng/buttongroup';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogService } from 'primeng/dynamicdialog';
import { MenuModule } from 'primeng/menu';
import {
  FileDownloadService,
  I18nService,
  TenantService,
  ToastService,
  extractBlobErrorMessage,
  extractErrorMessage,
  formatCop,
  formatFechaCorta,
} from '@reddoc/core';
import { BreadcrumbComponent, type BreadcrumbItem } from '@reddoc/feature-base';
import { AceptarConEnterDirective, PageActionsComponent } from '@reddoc/ui';
import type { AppDict } from '@erp/i18n';
import { ENTITY_ACTION_DIALOG_DEFAULTS } from '@erp/core/module-config/actions/entity-action-dialog.defaults';
import { NovedadService } from '../../novedad.service';
import { NOVEDAD_LIST_PATH } from '../../novedad.constants';
import type { Novedad, NovedadInterrumpirResponse } from '../../novedad.model';
import type { InterrumpirVacacionModalData } from '../../components/interrumpir-vacacion-modal/interrumpir-vacacion-modal.component';
import { esModificable, esVacaciones } from '../../novedad.rules';

/** Acciones del ciclo de vida de una vacación; las dos se confirman antes. */
type AccionCiclo = 'aprobar' | 'desaprobar';

/** Días y horas llegan como Decimal (string) con hasta 3 decimales; se pintan sin ceros de relleno. */
const cantidadFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

/**
 * Ficha de una novedad: lo que el formulario no muestra porque lo calcula el
 * backend (base de cotización, reparto empresa/entidad, pagos de vacaciones).
 *
 * Como en el ERP anterior, la ficha cambia con el tipo: las vacaciones se leen
 * por días y pagos de disfrute/dinero; el resto (incapacidades, licencias) por
 * lo que asume la empresa y lo que reconoce la entidad.
 *
 * Las vacaciones además se aprueban, se desaprueban, se imprimen y se
 * interrumpen (Utilidades) desde acá.
 * Aprobada, la novedad no se edita ni se elimina.
 */
@Component({
  selector: 'app-novedad-detail',
  standalone: true,
  imports: [
    ButtonGroupModule,
    ButtonModule,
    ConfirmDialogModule,
    MenuModule,
    AceptarConEnterDirective,
    BreadcrumbComponent,
    PageActionsComponent,
  ],
  providers: [ConfirmationService, DialogService],
  templateUrl: './novedad-detail.component.html',
  styleUrl: './novedad-detail.component.scss',
})
export class NovedadDetailComponent implements OnInit {
  private readonly novedadService = inject(NovedadService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly fileDownload = inject(FileDownloadService);
  private readonly dialog = inject(DialogService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly id = input<string>();

  protected readonly novedad = signal<Novedad | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly notFound = signal(false);
  /** Acción del ciclo en curso: muestra su spinner y bloquea las demás. */
  protected readonly accionEnCurso = signal<AccionCiclo | null>(null);
  protected readonly isPrinting = signal(false);

  /**
   * Entradas del dropdown "Acciones", como en las fichas de documento. `computed`
   * (ref estable salvo cambio de idioma o de estado) para que `p-menu` no pierda
   * el primer click al recrear el array en cada CD.
   */
  protected readonly accionesItems = computed<MenuItem[]>(() => {
    const a = this.t().documentActions.detail;
    const aprobada = this.novedad()?.estado_aprobado ?? false;
    return [
      {
        label: a.desaprobar,
        icon: 'pi pi-times-circle',
        disabled: !aprobada || this.accionEnCurso() !== null,
        command: () => this.confirmar('desaprobar'),
      },
    ];
  });

  /**
   * Utilidades: lo que se corrige sobre la vacación ya registrada, como en el
   * contrato. Interrumpir vale aprobada o no; con días en dinero el backend lo
   * rechaza, así que queda deshabilitada y dice por qué.
   */
  protected readonly utilidadesItems = computed<MenuItem[]>(() => {
    const m = this.t().entities.novedad.interrumpir;
    const conDinero = Number(this.novedad()?.dias_dinero ?? 0) > 0;
    return [
      {
        label: m.action,
        icon: 'pi pi-pause-circle',
        disabled: conDinero || this.accionEnCurso() !== null,
        title: conDinero ? m.conDinero : undefined,
        command: () => this.onInterrumpir(),
      },
    ];
  });

  /** Aprobada, ni Editar ni Eliminar: el backend lo rechaza. */
  protected readonly modificable = computed(() => {
    const n = this.novedad();
    return n != null && esModificable(n);
  });

  /** Misma regla que el formulario: decide cuál de las dos fichas se pinta. */
  protected readonly esVacaciones = computed(() =>
    esVacaciones(this.novedad()?.novedad_tipo ?? null),
  );

  /** Fecha ISO a `dd/mm/yyyy`, la convención del ERP. */
  protected fecha(iso: string | null | undefined): string {
    return formatFechaCorta(iso);
  }

  /** Importe en pesos. `formatCop` resuelve el nulo y el valor como string. */
  protected cop(valor: string | number | null | undefined): string {
    return valor != null ? formatCop(valor) : '';
  }

  /** Días u horas (Decimal del backend) con hasta dos decimales. */
  protected cantidad(valor: string | number | null | undefined): string {
    if (valor == null || valor === '') return '';
    const n = Number(valor);
    return Number.isFinite(n) ? cantidadFormatter.format(n) : '';
  }

  /** Migas: módulo Humano → listado de novedades → empleado de la novedad abierta. */
  protected readonly breadcrumbItems = computed<readonly BreadcrumbItem[]>(() => {
    const slug = this.tenant.currentSlug();
    const novedad = this.novedad();
    const items: BreadcrumbItem[] = [
      {
        label: this.t().modules.humano.name,
        routerLink: slug ? ['/t', slug, 'humano'] : undefined,
      },
      {
        label: this.t().entities.novedad.name,
        routerLink: slug ? ['/t', slug, ...NOVEDAD_LIST_PATH] : undefined,
      },
    ];
    if (novedad) items.push({ label: novedad.contrato_nombre || `#${novedad.id}` });
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
    this.loadNovedad(id);
  }

  protected onBack(): void {
    this.navigate(...NOVEDAD_LIST_PATH);
  }

  protected onEdit(): void {
    const n = this.novedad();
    if (!n) return;
    this.navigate(...NOVEDAD_LIST_PATH, 'editar', n.id);
  }

  protected onNew(): void {
    this.navigate(...NOVEDAD_LIST_PATH, 'nuevo');
  }

  /**
   * Pide confirmación y ejecuta. Aprobar es el paso que cierra (Enter acepta);
   * desaprobar lo revierte y se confirma en rojo, como en la liquidación.
   */
  protected confirmar(accion: AccionCiclo): void {
    if (this.accionEnCurso()) return;
    const confirmacion = this.t().entities.novedad.detail.confirmaciones[accion];
    this.confirmation.confirm({
      header: confirmacion.header,
      message: confirmacion.message,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().documentActions.detail[accion],
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: accion === 'desaprobar' ? 'p-button-danger' : '',
      acceptButtonProps: accion === 'aprobar' ? { autofocus: true } : undefined,
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.ejecutar(accion),
    });
  }

  /**
   * Abre el modal de interrupción. Responde la novedad reliquidada: se pinta tal
   * cual y el toast dice cuántos hábiles quedan para la reanudación.
   */
  protected onInterrumpir(): void {
    const n = this.novedad();
    if (!n || this.accionEnCurso()) return;

    from(import('../../components/interrumpir-vacacion-modal/interrumpir-vacacion-modal.component'))
      .pipe(
        switchMap(({ InterrumpirVacacionModalComponent }) => {
          const ref = this.dialog.open(InterrumpirVacacionModalComponent, {
            ...ENTITY_ACTION_DIALOG_DEFAULTS,
            width: '40rem',
            data: { novedad: n } satisfies InterrumpirVacacionModalData,
          });
          return ref ? ref.onClose : EMPTY;
        }),
        filter((r: unknown): r is NovedadInterrumpirResponse => r != null),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ novedad, dias_disfrutados_pendientes }) => {
        this.novedad.set(novedad);
        const ok = this.t().entities.novedad.detail.toasts.interrumpirSuccess;
        this.toast.success(
          ok.title,
          ok.desc.replace('{n}', this.cantidad(dias_disfrutados_pendientes) || '0'),
        );
      });
  }

  /**
   * PDF del formato de vacaciones, aprobada o no. Se descarga, como el de la
   * liquidación y los documentos. El error llega como `Blob`: se apaga el toast
   * del interceptor y se avisa acá con el `detail` del backend.
   */
  protected onImprimir(): void {
    const n = this.novedad();
    if (!n || this.isPrinting()) return;
    this.isPrinting.set(true);
    this.fileDownload
      .download(this.novedadService.imprimirUrl, {
        method: 'POST',
        body: { id: n.id },
        fallbackFilename: `vacaciones-${n.id}.pdf`,
        errorToast: false,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isPrinting.set(false)),
      )
      .subscribe({
        error: (err: unknown) => {
          const ts = this.t().documentActions.detail.toasts.imprimirError;
          void extractBlobErrorMessage(err, ts.desc).then((mensaje) =>
            this.toast.error(ts.title, mensaje),
          );
        },
      });
  }

  /**
   * Las dos responden la novedad actualizada: se pinta tal cual, sin recargar.
   * El error se avisa acá con el `detail` del backend: el interceptor no muestra
   * los 400 (no es la primera pendiente, ya aprobada…) y el servicio le apaga el
   * toast para que los demás status no salgan dos veces.
   */
  private ejecutar(accion: AccionCiclo): void {
    const n = this.novedad();
    if (!n) return;
    const toasts = this.t().entities.novedad.detail.toasts;
    const ok = accion === 'aprobar' ? toasts.aprobarSuccess : toasts.desaprobarSuccess;
    const fail = accion === 'aprobar' ? toasts.aprobarError : toasts.desaprobarError;
    const operacion =
      accion === 'aprobar'
        ? this.novedadService.aprobar(n.id)
        : this.novedadService.desaprobar(n.id);

    this.accionEnCurso.set(accion);
    operacion
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.accionEnCurso.set(null)),
      )
      .subscribe({
        next: (actualizada) => {
          this.novedad.set(actualizada);
          this.toast.success(ok.title, ok.desc);
        },
        error: (err: unknown) => this.toast.error(fail.title, extractErrorMessage(err, fail.desc)),
      });
  }

  private loadNovedad(id: number): void {
    this.novedadService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (n) => {
          this.novedad.set(n);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.notFound.set(true);
          const toasts = this.t().entities.novedad.detail.toasts;
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
