import { DatePipe, NgClass } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContenedorService, getInitials, I18nService, ToastService } from '@reddoc/core';
import {
  Contenedor,
  ContenedorInvitacionEstado,
  ContenedorInvitacionPendiente,
} from '@reddoc/core';
import type { ContenedoresTranslationsHost } from '../../i18n';

@Component({
  selector: 'lib-contenedor-pending-invites',
  standalone: true,
  imports: [DatePipe, NgClass],
  templateUrl: './contenedor-pending-invites.component.html',
})
export class ContenedorPendingInvitesComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly contenedor = input<Contenedor | null>(null);
  readonly refreshToken = input<number>(0);
  readonly countChange = output<number>();

  readonly isLoading = signal(false);
  readonly invitations = signal<ContenedorInvitacionPendiente[]>([]);

  constructor() {
    effect(() => {
      this.refreshToken();
      const c = this.contenedor();
      if (c) this.loadInvitations(c.cliente_id);
    });
  }

  initials(invite: ContenedorInvitacionPendiente): string {
    const source =
      invite.usuario_invitado_nombre_corto?.trim() || invite.usuario_invitado_correo || '';
    return getInitials(source);
  }

  estadoLabel(estado: ContenedorInvitacionEstado): string {
    return this.t().contenedores.invite.pending.estados[estado] ?? estado;
  }

  estadoClass(estado: ContenedorInvitacionEstado): string {
    if (estado === 'A') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (estado === 'R') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  private loadInvitations(contenedorId: number): void {
    this.isLoading.set(true);
    this.contenedorService
      .getPendingInvitations(contenedorId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.invitations.set([...(res.results ?? [])]);
          this.countChange.emit(this.invitations().length);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          const toasts = this.t().contenedores.invite.pending.toasts.loadError;
          this.toastService.error(toasts.title, toasts.desc);
        },
      });
  }
}
