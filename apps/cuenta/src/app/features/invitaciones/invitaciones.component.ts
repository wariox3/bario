import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import {
  ContenedorService,
  InvitacionRecibida,
  ToastService,
  extractErrorMessage,
  getInitials,
  FORMATO_FECHA,
} from '@reddoc/core';

@Component({
  selector: 'app-invitaciones',
  standalone: true,
  imports: [DatePipe, ButtonModule],
  templateUrl: './invitaciones.component.html',
})
export class InvitacionesComponent implements OnInit {
  /** Formato de fecha del sistema, para el `| date` de la plantilla. */
  protected readonly formatoFecha = FORMATO_FECHA.angular;

  private readonly contenedorService = inject(ContenedorService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly invitaciones = signal<InvitacionRecibida[]>([]);
  readonly acceptingId = signal<number | null>(null);
  readonly rejectingId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  initials(inv: InvitacionRecibida): string {
    return getInitials(inv.cliente_nombre ?? '');
  }

  gruposLabel(inv: InvitacionRecibida): string {
    return inv.grupos_nombres.join(', ');
  }

  inviterLabel(inv: InvitacionRecibida): string {
    return inv.usuario_nombre_corto?.trim() || inv.usuario_email || 'Un miembro del contenedor';
  }

  accept(inv: InvitacionRecibida): void {
    if (this.isBusy()) return;

    this.acceptingId.set(inv.id);
    this.contenedorService
      .aceptarInvitacion(inv.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.acceptingId.set(null);
          this.invitaciones.update((list) => list.filter((i) => i.id !== inv.id));
          this.toast.success('Invitación aceptada', `Ya formas parte de ${inv.cliente_nombre}.`);
        },
        error: (err) => {
          this.acceptingId.set(null);
          this.toast.error('Error', extractErrorMessage(err, 'No se pudo aceptar la invitación.'));
        },
      });
  }

  reject(inv: InvitacionRecibida): void {
    if (this.isBusy()) return;

    this.rejectingId.set(inv.id);
    this.contenedorService
      .rechazarInvitacion(inv.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.rejectingId.set(null);
          this.invitaciones.update((list) => list.filter((i) => i.id !== inv.id));
          this.toast.success(
            'Invitación rechazada',
            `Rechazaste la invitación a ${inv.cliente_nombre}.`,
          );
        },
        error: (err) => {
          this.rejectingId.set(null);
          this.toast.error('Error', extractErrorMessage(err, 'No se pudo rechazar la invitación.'));
        },
      });
  }

  isBusy(): boolean {
    return this.acceptingId() !== null || this.rejectingId() !== null;
  }

  private load(): void {
    this.isLoading.set(true);
    this.contenedorService
      .getInvitacionesRecibidas()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.invitaciones.set([...(res.results ?? [])]);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.toast.error('Error', 'No se pudieron cargar tus invitaciones.');
        },
      });
  }
}
