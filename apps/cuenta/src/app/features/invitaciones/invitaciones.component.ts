import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { ToastService, extractErrorMessage, getInitials, FORMATO_FECHA } from '@reddoc/core';
import { InvitacionPendiente } from './models/invitacion.model';
import { InvitacionesService } from './services/invitaciones.service';

@Component({
  selector: 'app-invitaciones',
  standalone: true,
  imports: [DatePipe, ButtonModule],
  templateUrl: './invitaciones.component.html',
})
export class InvitacionesComponent implements OnInit {
  /** Formato de fecha del sistema, para el `| date` de la plantilla. */
  protected readonly formatoFecha = FORMATO_FECHA.angular;

  private readonly invitacionesService = inject(InvitacionesService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal(true);
  readonly invitaciones = signal<InvitacionPendiente[]>([]);
  readonly acceptingId = signal<number | null>(null);
  readonly rejectingId = signal<number | null>(null);

  ngOnInit(): void {
    this.load();
  }

  initials(inv: InvitacionPendiente): string {
    return getInitials(inv.cliente_nombre ?? '');
  }

  inviterLabel(inv: InvitacionPendiente): string {
    return inv.usuario_nombre_corto?.trim() || inv.usuario_correo || 'Un miembro del contenedor';
  }

  accept(inv: InvitacionPendiente): void {
    if (this.isBusy()) return;

    this.acceptingId.set(inv.id);
    this.invitacionesService
      .aceptar(inv.id)
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

  reject(inv: InvitacionPendiente): void {
    if (this.isBusy()) return;

    this.rejectingId.set(inv.id);
    this.invitacionesService
      .rechazar(inv.id)
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
    this.invitacionesService
      .getPendientes()
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
