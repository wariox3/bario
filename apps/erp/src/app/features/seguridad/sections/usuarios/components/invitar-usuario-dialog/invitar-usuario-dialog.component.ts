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
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import {
  I18nService,
  TenantService,
  ToastService,
  extractErrorMessage,
  getInitials,
  type ContenedorAccesoFlags,
  type GrupoSeguridad,
  type UserSearchResult,
} from '@reddoc/core';
import { readModuleAccessFlags } from '@erp/core/permissions';
import type { AppDict } from '@erp/i18n';
import { SeguridadUsuariosService } from '../../usuarios.service';
import {
  INVITACION_ACCESOS,
  accesoFlag,
  type InvitacionAcceso,
  type InvitacionAccesoId,
} from '../../usuarios.constants';

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
 * que sí se define acá es con qué entra la persona — sus **grupos de
 * seguridad** (`grupo_ids`) y sus **accesos por módulo** (flags `acceso_*`).
 *
 * Los accesos ofrecidos se recortan al plan del contenedor: no se puede invitar
 * a alguien a un módulo que la empresa no contrató. Arrancan todos apagados: se
 * marca explícitamente a qué se le da acceso.
 */
@Component({
  selector: 'app-invitar-usuario-dialog',
  standalone: true,
  imports: [
    FormsModule,
    DialogModule,
    ButtonModule,
    AutoCompleteModule,
    MultiSelectModule,
    CheckboxModule,
  ],
  templateUrl: './invitar-usuario-dialog.component.html',
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

  // Mutable a propósito: `<p-multiselect [options]>` no acepta `readonly`.
  protected readonly grupos = signal<GrupoSeguridad[]>([]);
  protected readonly selectedGrupoIds = signal<number[]>([]);
  protected readonly isLoadingGrupos = signal(false);

  /**
   * Accesos que se pueden otorgar: los del plan del contenedor.
   *
   * Si el contenedor no trae ninguna flag `acceso_*` no hay contra qué filtrar
   * (ver `readModuleAccessFlags`), y se ofrecen todos — quedarse sin ninguna
   * casilla por un campo que faltó sería peor que ofrecer de más.
   */
  protected readonly accesosDisponibles = computed<readonly InvitacionAcceso[]>(() => {
    const contratados = readModuleAccessFlags(this.tenant.currentContenedor());
    if (contratados === null) return INVITACION_ACCESOS;
    return INVITACION_ACCESOS.filter((acceso) => contratados.has(accesoFlag(acceso.id)));
  });

  /** Accesos marcados. Arranca vacío: se otorga lo que se marque, nada más. */
  protected readonly selectedAccesoIds = signal<readonly InvitacionAccesoId[]>([]);

  protected readonly todosLosAccesos = computed(
    () => this.selectedAccesoIds().length === this.accesosDisponibles().length,
  );

  constructor() {
    // Cada apertura arranca limpia: no arrastra el intento anterior. Los
    // grupos se piden en cada apertura por si cambiaron desde la última vez.
    effect(() => {
      if (this.visible()) {
        this.selection.set('');
        this.suggestions.set([]);
        this.selectedGrupoIds.set([]);
        this.selectedAccesoIds.set([]);
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
          this.grupos.set([...grupos]);
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

  protected isAccesoSelected(id: InvitacionAccesoId): boolean {
    return this.selectedAccesoIds().includes(id);
  }

  protected toggleAcceso(id: InvitacionAccesoId): void {
    this.selectedAccesoIds.update((ids) =>
      ids.includes(id) ? ids.filter((actual) => actual !== id) : [...ids, id],
    );
  }

  /** Atajo del encabezado: marca todos los disponibles o los desmarca todos. */
  protected toggleTodosLosAccesos(): void {
    this.selectedAccesoIds.set(
      this.todosLosAccesos() ? [] : this.accesosDisponibles().map((acceso) => acceso.id),
    );
  }

  /**
   * Flags tal como las espera el backend: **todos** los accesos ofrecidos, con
   * su booleano explícito. Los que el plan del contenedor no incluye no viajan;
   * ese permiso no es de la persona sino de la empresa.
   */
  private accesosPayload(): ContenedorAccesoFlags {
    const flags: Record<string, boolean> = {};
    for (const acceso of this.accesosDisponibles()) {
      flags[accesoFlag(acceso.id)] = this.isAccesoSelected(acceso.id);
    }
    return flags as ContenedorAccesoFlags;
  }

  protected onSubmit(): void {
    const user = this.selectedUser();
    if (!user || this.isSending()) return;

    this.isSending.set(true);
    const toasts = this.t().seguridad.usuarios.toasts;
    this.service
      .invite(user.id, {
        grupoIds: this.selectedGrupoIds(),
        accesos: this.accesosPayload(),
      })
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
