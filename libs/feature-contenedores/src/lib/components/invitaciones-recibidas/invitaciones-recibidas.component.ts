import { Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, timer } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import {
  ContenedorService,
  I18nService,
  InvitacionRecibida,
  ToastService,
  extractErrorMessage,
  formatRecencia,
  getInitials,
} from '@reddoc/core';
import type { ContenedoresTranslationsHost } from '../../i18n';

/** Por encima de esta cantidad, el resto queda detrás de «Ver n más». */
const VISIBLES = 2;

/** Lo que dura el pliegue de una fila al salir (igual que la transición del CSS). */
const SALIDA_MS = 280;

/** Lo que espera la confirmación de «Rechazar» antes de volver sola al estado normal. */
const CONFIRMACION_MS = 5000;

/**
 * Invitaciones que recibió la persona, en la puerta de su listado de empresas.
 *
 * Cada fila es la misma pieza que una fila del listado —monograma, nombre,
 * pill de relación— pero con el contorno **punteado**: está ofrecida, todavía
 * no es suya. Al aceptar, la fila se pliega y emite `aceptada` para que el
 * listado recargue y reciba a la empresa nueva.
 *
 * No hay skeleton ni estado vacío: hasta que el backend confirma que hay al
 * menos una, no se pinta nada (y si la consulta falla, tampoco). Así la página
 * no parpadea en cada entrada de quien no tiene invitaciones.
 */
@Component({
  selector: 'lib-invitaciones-recibidas',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './invitaciones-recibidas.component.html',
})
export class InvitacionesRecibidasComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = computed(() => this.i18n.t().contenedores.invitaciones);
  protected readonly miembroLabel = computed(() => this.i18n.t().contenedores.list.roles.miembro);

  /** `cliente` de la invitación aceptada: el listado lo recibe recién unido. */
  readonly aceptada = output<number>();

  /** `null` mientras carga o si falló: en ambos casos no se pinta nada. */
  protected readonly invitaciones = signal<readonly InvitacionRecibida[] | null>(null);

  /** Ids que se están plegando: siguen en la lista hasta que termina la transición. */
  protected readonly saliendo = signal<ReadonlySet<number>>(new Set());
  protected readonly aceptandoId = signal<number | null>(null);
  protected readonly rechazandoId = signal<number | null>(null);
  /** Fila que pregunta «¿Rechazar la invitación?» en lugar de mostrar sus botones. */
  protected readonly confirmandoId = signal<number | null>(null);
  protected readonly expandido = signal(false);

  private confirmacionTimer?: Subscription;

  protected readonly ocupado = computed(
    () => this.aceptandoId() !== null || this.rechazandoId() !== null,
  );

  protected readonly total = computed(() => this.invitaciones()?.length ?? 0);

  /** El bloque entero se pliega cuando su última fila se va. */
  protected readonly cerrando = computed(() => {
    const lista = this.invitaciones() ?? [];
    return lista.length > 0 && lista.every((i) => this.saliendo().has(i.id));
  });

  protected readonly visibles = computed(() => {
    const lista = this.invitaciones() ?? [];
    return this.expandido() || lista.length <= VISIBLES ? lista : lista.slice(0, VISIBLES);
  });

  protected readonly ocultas = computed(() => Math.max(0, this.total() - VISIBLES));

  protected readonly encabezado = computed(() => {
    const n = this.total();
    const { one, other } = this.t().eyebrow;
    return n === 1 ? one : other.replace('{n}', String(n));
  });

  protected readonly verMas = computed(() => {
    const n = this.ocultas();
    const { one, other } = this.t().more;
    return n === 1 ? one : other.replace('{n}', String(n));
  });

  constructor() {
    this.contenedorService
      // Si falla, la tira simplemente no aparece: no hay nada que el usuario pueda hacer.
      .getInvitacionesRecibidas({ errorToast: false })
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (res) => this.invitaciones.set(res.results ?? []),
        error: () => this.invitaciones.set(null),
      });
    this.destroyRef.onDestroy(() => this.confirmacionTimer?.unsubscribe());
  }

  protected iniciales(inv: InvitacionRecibida): string {
    return getInitials(inv.cliente_nombre);
  }

  protected invitadoPor(inv: InvitacionRecibida): string {
    const nombre = inv.usuario_nombre_corto?.trim() || inv.usuario_email || this.t().someone;
    return this.t().invitedBy.replace('{nombre}', nombre);
  }

  protected recencia(inv: InvitacionRecibida): string {
    const fecha = new Date(inv.fecha);
    return Number.isNaN(fecha.getTime()) ? '' : formatRecencia(fecha, Date.now());
  }

  protected grupos(inv: InvitacionRecibida): string {
    return inv.grupos_nombres.join(', ');
  }

  aceptar(inv: InvitacionRecibida): void {
    if (this.ocupado()) return;
    this.cancelarConfirmacion();
    this.aceptandoId.set(inv.id);
    this.contenedorService
      .aceptarInvitacion(inv.id, { errorToast: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.aceptandoId.set(null);
          this.retirar(inv.id);
          this.aceptada.emit(inv.cliente);
        },
        error: (err: unknown) => {
          this.aceptandoId.set(null);
          const { title, desc } = this.t().toasts.acceptError;
          this.toast.error(title, extractErrorMessage(err, desc));
          // 409 = ya es miembro: la empresa ya está en su listado, y la invitación sobra.
          if (this.yaNoAplica(err)) {
            this.retirar(inv.id);
            if (err instanceof HttpErrorResponse && err.status === 409) {
              this.aceptada.emit(inv.cliente);
            }
          }
        },
      });
  }

  /** Primer clic: la fila pregunta. Vuelve sola si nadie responde. */
  pedirConfirmacion(inv: InvitacionRecibida): void {
    if (this.ocupado()) return;
    this.confirmacionTimer?.unsubscribe();
    this.confirmandoId.set(inv.id);
    this.confirmacionTimer = timer(CONFIRMACION_MS).subscribe(() => this.confirmandoId.set(null));
  }

  cancelarConfirmacion(): void {
    this.confirmacionTimer?.unsubscribe();
    this.confirmandoId.set(null);
  }

  rechazar(inv: InvitacionRecibida): void {
    if (this.ocupado()) return;
    this.confirmacionTimer?.unsubscribe();
    this.rechazandoId.set(inv.id);
    this.contenedorService
      .rechazarInvitacion(inv.id, { errorToast: false })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.rechazandoId.set(null);
          this.confirmandoId.set(null);
          this.retirar(inv.id);
        },
        error: (err: unknown) => {
          this.rechazandoId.set(null);
          this.confirmandoId.set(null);
          const { title, desc } = this.t().toasts.rejectError;
          this.toast.error(title, extractErrorMessage(err, desc));
          if (this.yaNoAplica(err)) this.retirar(inv.id);
        },
      });
  }

  /** 404/403/409: la invitación ya no se puede responder, no tiene sentido dejarla. */
  private yaNoAplica(err: unknown): boolean {
    return err instanceof HttpErrorResponse && [403, 404, 409].includes(err.status);
  }

  /** Pliega la fila y la quita cuando termina la transición. */
  private retirar(id: number): void {
    this.saliendo.update((s) => new Set(s).add(id));
    timer(SALIDA_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.invitaciones.update((lista) => lista?.filter((i) => i.id !== id) ?? null);
        this.saliendo.update((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      });
  }
}
