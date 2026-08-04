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
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AutoCompleteModule,
  type AutoCompleteCompleteEvent,
  type AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
  I18nService,
  ToastService,
  extractErrorMessage,
  getInitials,
  type UserSearchResult,
} from '@reddoc/core';
import type { AppDict } from '@erp/i18n';
import { SeguridadUsuariosService } from '../../usuarios.service';

/** Mínimo de caracteres antes de pegarle al buscador de usuarios. */
const SEARCH_MIN_LENGTH = 3;

/**
 * Invitar un usuario al contenedor.
 *
 * Busca a la persona en la plataforma (no crea cuentas: invita a alguien que ya
 * existe). La invitación queda pendiente hasta que el invitado la acepte, por
 * eso el diálogo no toca el listado: emite `invited` y el host recarga.
 *
 * **El rol no se pide ni se manda** mientras se confirma si viaja en la
 * invitación o se asigna al aceptarla; se cambia desde la fila del listado.
 */
@Component({
  selector: 'app-invitar-usuario-dialog',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, AutoCompleteModule],
  templateUrl: './invitar-usuario-dialog.component.html',
})
export class InvitarUsuarioDialogComponent {
  private readonly service = inject(SeguridadUsuariosService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = input<boolean>(false);
  readonly visibleChange = output<boolean>();
  /** La invitación salió; el host recarga el listado. */
  readonly invited = output<void>();

  // Mutable a propósito: `<p-autocomplete [suggestions]>` no acepta `readonly`.
  protected readonly suggestions = signal<UserSearchResult[]>([]);
  protected readonly isSearching = signal(false);
  protected readonly isSending = signal(false);

  /** El autocomplete guarda el texto tipeado o el usuario elegido. */
  protected readonly selection = signal<UserSearchResult | string>('');

  protected readonly selectedUser = computed<UserSearchResult | null>(() => {
    const value = this.selection();
    return typeof value === 'object' && value !== null ? value : null;
  });

  constructor() {
    // Cada apertura arranca limpia: no arrastra el intento anterior.
    effect(() => {
      if (this.visible()) {
        this.selection.set('');
        this.suggestions.set([]);
        this.isSending.set(false);
      }
    });
  }

  protected initials(user: UserSearchResult): string {
    return getInitials(user.nombre_corto || user.email);
  }

  protected onSearch(event: AutoCompleteCompleteEvent): void {
    if (event.query.length < SEARCH_MIN_LENGTH) {
      this.suggestions.set([]);
      return;
    }
    this.isSearching.set(true);
    this.service
      .searchUsuarios(event.query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (results) => {
          this.suggestions.set([...results]);
          this.isSearching.set(false);
        },
        error: () => {
          this.suggestions.set([]);
          this.isSearching.set(false);
        },
      });
  }

  protected onSelect(event: AutoCompleteSelectEvent): void {
    this.selection.set(event.value as UserSearchResult);
  }

  protected onCancel(): void {
    this.visibleChange.emit(false);
  }

  protected onSubmit(): void {
    const user = this.selectedUser();
    if (!user || this.isSending()) return;

    this.isSending.set(true);
    const toasts = this.t().seguridad.usuarios.toasts;
    this.service
      .invite(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSending.set(false);
          this.toast.success(toasts.inviteSuccess.title, toasts.inviteSuccess.desc);
          this.invited.emit();
          this.visibleChange.emit(false);
        },
        error: (err: unknown) => {
          this.isSending.set(false);
          this.toast.error(
            toasts.inviteError.title,
            extractErrorMessage(err, toasts.inviteError.desc),
          );
        },
      });
  }
}
