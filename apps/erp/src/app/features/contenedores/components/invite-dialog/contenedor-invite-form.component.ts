import {
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AutoComplete,
  AutoCompleteCompleteEvent,
  AutoCompleteSelectEvent,
  AutoCompleteModule,
} from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import {
  Contenedor,
  ContenedorService,
  extractErrorMessage,
  getInitials,
  I18nService,
  ToastService,
  UserSearchResult,
} from '@reddoc/core';
import type { AppDict } from '../../../../i18n';

const ROL_ID_DEFAULT = 9;

@Component({
  selector: 'app-contenedor-invite-form',
  standalone: true,
  imports: [FormsModule, ButtonModule, AutoCompleteModule],
  templateUrl: './contenedor-invite-form.component.html',
})
export class ContenedorInviteFormComponent {
  private readonly contenedorService = inject(ContenedorService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly contenedor = input<Contenedor | null>(null);
  readonly invited = output<void>();

  private readonly autocomplete = viewChild.required(AutoComplete);

  readonly autocompleteValue = signal<UserSearchResult | string>('');
  readonly selectedUser = computed(() => {
    const v = this.autocompleteValue();
    return typeof v === 'object' && v !== null ? v : null;
  });

  readonly userSuggestions = signal<UserSearchResult[]>([]);
  readonly isSearching = signal(false);
  readonly isSending = signal(false);

  userInitials(user: UserSearchResult): string {
    return getInitials(user.nombre_corto || user.email);
  }

  searchUsers(event: AutoCompleteCompleteEvent): void {
    if (event.query.length < 3) {
      this.userSuggestions.set([]);
      return;
    }
    this.isSearching.set(true);
    this.contenedorService
      .searchUsers(event.query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.userSuggestions.set(r);
          this.isSearching.set(false);
        },
        error: () => {
          this.userSuggestions.set([]);
          this.isSearching.set(false);
        },
      });
  }

  onUserSelected(event: AutoCompleteSelectEvent): void {
    this.autocompleteValue.set(event.value as UserSearchResult);
  }

  onSubmit(): void {
    const c = this.contenedor();
    const user = this.selectedUser();
    if (!c || !user || this.isSending()) return;

    this.isSending.set(true);
    this.contenedorService
      .sendInvitation({ cliente_id: c.cliente_id, usuario_id: user.id, rol_id: ROL_ID_DEFAULT })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSending.set(false);
          const toasts = this.t().contenedores.invite.toasts.sent;
          this.toastService.success(toasts.title, toasts.desc);
          this.autocompleteValue.set('');
          this.userSuggestions.set([]);
          this.autocomplete().clear();
          this.invited.emit();
        },
        error: (err) => {
          this.isSending.set(false);
          const toasts = this.t().contenedores.invite.toasts.sendError;
          this.toastService.error(toasts.title, extractErrorMessage(err, toasts.desc));
        },
      });
  }
}
