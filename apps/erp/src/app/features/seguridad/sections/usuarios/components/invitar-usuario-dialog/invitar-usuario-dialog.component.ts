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
import { Subject, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import {
  AutoCompleteModule,
  type AutoCompleteCompleteEvent,
  type AutoCompleteSelectEvent,
} from 'primeng/autocomplete';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import {
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
  getInitials,
  type GrupoSeguridad,
  type UserSearchResult,
} from '@reddoc/core';
import { GruposSeguridadComponent } from '@reddoc/ui';
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
 * **El rol no se pide ni se manda**: se cambia desde la fila del listado. Lo
 * que sí se define acá es con qué entra la persona: sus **grupos de
 * seguridad** (`grupo_ids`). Arrancan todos apagados.
 */
@Component({
  selector: 'app-invitar-usuario-dialog',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, AutoCompleteModule, GruposSeguridadComponent],
  templateUrl: './invitar-usuario-dialog.component.html',
  styles: ':host { display: contents; }',
})
export class InvitarUsuarioDialogComponent {
  private readonly service = inject(SeguridadUsuariosService);
  private readonly tenant = inject(TenantService);
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

  protected readonly grupos = signal<readonly GrupoSeguridad[]>([]);
  /** Grupos marcados. Arranca vacío: se asigna lo que se marque, nada más. */
  protected readonly selectedGrupoIds = signal<readonly number[]>([]);
  protected readonly isLoadingGrupos = signal(false);

  /** Contenedor al que se invita: el activo. Su nombre va en el título. */
  protected readonly contenedor = this.tenant.currentContenedor;

  /** Términos tecleados; la última consulta gana. */
  private readonly search$ = new Subject<string>();

  constructor() {
    // `switchMap` cancela la búsqueda en vuelo al llegar un término nuevo: sin él,
    // la respuesta de un prefijo corto puede llegar tarde y pisar la del completo.
    this.search$
      .pipe(
        tap(() => this.isSearching.set(true)),
        switchMap((query) =>
          this.service.searchUsuarios(query).pipe(catchError(() => of<UserSearchResult[]>([]))),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((results) => {
        this.suggestions.set([...results]);
        this.isSearching.set(false);
      });

    // Cada apertura arranca limpia: no arrastra el intento anterior. Los
    // grupos se piden en cada apertura por si cambiaron desde la última vez.
    effect(() => {
      if (this.visible()) {
        this.selection.set('');
        this.suggestions.set([]);
        this.selectedGrupoIds.set([]);
        this.isSending.set(false);
        this.loadGrupos();
      }
    });
  }

  private loadGrupos(): void {
    this.isLoadingGrupos.set(true);
    this.service
      .getGrupos()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (grupos) => {
          this.grupos.set(grupos);
          this.isLoadingGrupos.set(false);
        },
        error: () => {
          this.grupos.set([]);
          this.isLoadingGrupos.set(false);
        },
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
    this.search$.next(event.query);
  }

  protected onSelect(event: AutoCompleteSelectEvent): void {
    this.selection.set(event.value as UserSearchResult);
  }

  protected onSubmit(): void {
    const user = this.selectedUser();
    if (!user || this.isSending()) return;

    this.isSending.set(true);
    const toasts = this.t().seguridad.usuarios.toasts;
    this.service
      .invite(user.id, this.selectedGrupoIds())
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
