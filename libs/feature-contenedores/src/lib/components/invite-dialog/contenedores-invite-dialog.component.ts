import { Component, effect, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { Contenedor, I18nService } from '@reddoc/core';
import { ContenedorInviteFormComponent } from './contenedor-invite-form.component';
import { ContenedorMembersListComponent } from './contenedor-members-list.component';
import { ContenedorPendingInvitesComponent } from './contenedor-pending-invites.component';
import type { ContenedoresTranslationsHost } from '../../i18n';

@Component({
  selector: 'lib-contenedores-invite-dialog',
  standalone: true,
  imports: [
    DialogModule,
    ButtonModule,
    TabsModule,
    ContenedorInviteFormComponent,
    ContenedorMembersListComponent,
    ContenedorPendingInvitesComponent,
  ],
  templateUrl: './contenedores-invite-dialog.component.html',
  styleUrl: './contenedores-invite-dialog.component.scss',
})
export class ContenedoresInviteDialogComponent {
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = input<boolean>(false);
  readonly contenedor = input<Contenedor | null>(null);
  readonly visibleChange = output<boolean>();

  protected readonly activeTab = signal('members');
  protected readonly refreshToken = signal(0);
  protected readonly membersCount = signal<number | null>(null);
  protected readonly pendingCount = signal<number | null>(null);

  constructor() {
    effect(() => {
      if (!this.visible()) {
        this.membersCount.set(null);
        this.pendingCount.set(null);
      }
    });
  }

  onInvited(): void {
    this.refreshToken.update((n) => n + 1);
    this.activeTab.set('pending');
  }

  onClose(): void {
    this.visibleChange.emit(false);
  }
}
