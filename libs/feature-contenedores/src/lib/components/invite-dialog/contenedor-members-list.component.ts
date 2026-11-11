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
  extractErrorMessage,
  getInitials,
  I18nService,
  ToastService,
} from '@reddoc/core';
import type { ContenedoresTranslationsHost } from '../../i18n';

type RolMiembro = 'propietario' | 'administrador' | 'soporte' | 'miembro';

/** Una sola relación por persona; propietario gana a todo, soporte a miembro. */
const rolDe = (member: ContenedorMember): RolMiembro => {
  if (member.propietario) return 'propietario';
  if (member.administrador) return 'administrador';
  if (member.soporte) return 'soporte';
  return 'miembro';
};

const ORDEN_ROL: readonly RolMiembro[] = ['propietario', 'administrador', 'miembro', 'soporte'];
const rangoDeRol = (rol: RolMiembro): number => ORDEN_ROL.indexOf(rol);

/**
 * Pill de la relación con la empresa: los mismos tonos e íconos que la de la
 * lista de contenedores y la columna «Rol» de Seguridad (ver system.md).
 */
const PILL_DE_ROL: Readonly<Record<RolMiembro, { clase: string; icono: string | null }>> = {
  propietario: { clase: 'border-indigo-200 bg-indigo-50 text-indigo-700', icono: 'pi pi-crown' },
  administrador: { clase: 'border-sky-200 bg-sky-50 text-sky-700', icono: 'pi pi-shield' },
  soporte: { clase: 'border-dashed border-slate-400 text-slate-600', icono: 'pi pi-headphones' },
  miembro: { clase: 'border-slate-200 bg-slate-50 text-slate-700', icono: null },
};

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

  /** Propietario primero, luego administradores, después el resto por nombre. */
  readonly sortedMembers = computed(() =>
    [...this.members()].sort((a, b) => {
      const r = rangoDeRol(rolDe(a)) - rangoDeRol(rolDe(b));
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

  /** Etiqueta de la pill, de las banderas propietario / administrador / soporte. */
  roleLabel(member: ContenedorMember): string {
    return this.t().contenedores.invite.members.roles[rolDe(member)];
  }

  roleIcon(member: ContenedorMember): string | null {
    return PILL_DE_ROL[rolDe(member)].icono;
  }

  monogramClass(member: ContenedorMember): string {
    switch (rolDe(member)) {
      case 'propietario':
        return 'bg-indigo-100 text-indigo-800';
      case 'administrador':
        return 'bg-sky-100 text-sky-800';
      default:
        return 'bg-[rgba(20,48,73,0.06)] text-brand-navy';
    }
  }

  rowClass(member: ContenedorMember): string {
    return member.propietario ? 'bg-indigo-50/40' : '';
  }

  pillClass(member: ContenedorMember): string {
    return PILL_DE_ROL[rolDe(member)].clase;
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
        error: (err: unknown) => {
          this.removingId.set(null);
          const toasts = this.t().contenedores.invite.toasts.removeError;
          this.toastService.error(toasts.title, extractErrorMessage(err, toasts.desc));
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
