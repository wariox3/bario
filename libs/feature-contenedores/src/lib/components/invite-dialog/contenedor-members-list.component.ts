import { NgClass } from '@angular/common';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AUTH_SERVICE,
  Contenedor,
  ContenedorMember,
  ContenedorService,
  getInitials,
  I18nService,
  ToastService,
} from '@reddoc/core';
import type { ContenedoresTranslationsHost } from '../../i18n';

@Component({
  selector: 'lib-contenedor-members-list',
  standalone: true,
  imports: [NgClass],
  templateUrl: './contenedor-members-list.component.html',
})
export class ContenedorMembersListComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly toastService = inject(ToastService);
  private readonly authService = inject(AUTH_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<ContenedoresTranslationsHost>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly contenedor = input<Contenedor | null>(null);
  readonly refreshToken = input<number>(0);
  readonly countChange = output<number>();

  readonly isLoading = signal(false);
  readonly members = signal<ContenedorMember[]>([]);
  readonly pendingRemoveId = signal<number | null>(null);
  readonly removingId = signal<number | null>(null);

  readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

  /** Propietario primero, después el resto por nombre. */
  readonly sortedMembers = computed(() =>
    [...this.members()].sort((a, b) => {
      const r = Number(b.propietario) - Number(a.propietario);
      if (r !== 0) return r;
      return (a.usuario_nombre_corto ?? a.usuario_email).localeCompare(
        b.usuario_nombre_corto ?? b.usuario_email,
      );
    }),
  );

  constructor() {
    effect(() => {
      this.refreshToken();
      const c = this.contenedor();
      if (c) this.loadMembers(c.cliente_id);
    });
  }

  initials(member: ContenedorMember): string {
    const source = member.usuario_nombre_corto?.trim() || member.usuario_email || '';
    return getInitials(source);
  }

  isYou(member: ContenedorMember): boolean {
    const me = this.currentUserId();
    return me !== null && member.usuario_id === me;
  }

  canRemove(member: ContenedorMember): boolean {
    return !member.propietario && !this.isYou(member);
  }

  /**
   * Etiqueta de la pill. El backend ya no manda nombre de rol: a nivel
   * contenedor solo dice si la persona es la propietaria.
   */
  roleLabel(member: ContenedorMember): string {
    const roles = this.t().contenedores.invite.members.roles;
    return member.propietario ? roles.propietario : roles.miembro;
  }

  monogramClass(member: ContenedorMember): string {
    return member.propietario
      ? 'bg-amber-100 text-amber-800'
      : 'bg-[rgba(20,48,73,0.06)] text-brand-navy';
  }

  rowClass(member: ContenedorMember): string {
    return member.propietario ? 'bg-amber-50/40' : '';
  }

  pillClass(member: ContenedorMember): string {
    return member.propietario
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';
  }

  requestRemove(member: ContenedorMember): void {
    this.pendingRemoveId.set(member.id);
  }

  cancelRemove(): void {
    this.pendingRemoveId.set(null);
  }

  confirmRemove(member: ContenedorMember): void {
    const c = this.contenedor();
    if (!c || this.removingId() !== null) return;

    this.removingId.set(member.id);
    this.contenedorService
      .removeMember(member.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removingId.set(null);
          this.pendingRemoveId.set(null);
          const toasts = this.t().contenedores.invite.toasts.removed;
          this.toastService.success(toasts.title, toasts.desc);
          this.loadMembers(c.cliente_id);
        },
        error: () => {
          this.removingId.set(null);
          const toasts = this.t().contenedores.invite.toasts.removeError;
          this.toastService.error(toasts.title, toasts.desc);
        },
      });
  }

  private loadMembers(contenedorId: number): void {
    this.isLoading.set(true);
    this.contenedorService
      .getMembers(contenedorId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.members.set([...(res.results ?? [])]);
          this.countChange.emit(this.members().length);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          const toasts = this.t().contenedores.invite.toasts.loadError;
          this.toastService.error(toasts.title, toasts.desc);
        },
      });
  }
}
