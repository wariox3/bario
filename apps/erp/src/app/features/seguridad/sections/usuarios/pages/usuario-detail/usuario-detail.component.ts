import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { finalize } from 'rxjs';
import { I18nService, TenantService, ToastService, getInitials } from '@reddoc/core';
import { CONTENEDOR_ROL } from '@erp/core/permissions';
import type { AppDict } from '@erp/i18n';
import { CambiarRolDialogComponent } from '../../components/cambiar-rol-dialog/cambiar-rol-dialog.component';
import { SEGURIDAD_USUARIOS_PATH } from '../../usuarios.constants';
import type { UsuarioRow } from '../../usuarios.model';
import { SeguridadUsuariosService } from '../../usuarios.service';
import { toUsuarioRow } from '../../usuarios.utils';

/**
 * Detalle de un usuario del contenedor.
 *
 * El backend no expone el miembro suelto: se pide la lista del contenedor y se
 * busca el `id` de la URL. Cuesta lo mismo que ya cuesta la lista y evita
 * inventar un endpoint; el día que exista, solo cambia `load()`.
 */
@Component({
  selector: 'app-usuario-detail',
  standalone: true,
  imports: [ButtonModule, ConfirmDialogModule, CambiarRolDialogComponent],
  providers: [ConfirmationService],
  templateUrl: './usuario-detail.component.html',
  host: { class: 'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto' },
})
export class UsuarioDetailComponent {
  private readonly service = inject(SeguridadUsuariosService);
  private readonly tenant = inject(TenantService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  /** `id` de la membresía (`usuario-cliente`), no del usuario. */
  readonly id = input.required<string>();

  protected readonly usuario = signal<UsuarioRow | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly notFound = signal(false);
  protected readonly rolDialogVisible = signal(false);

  protected readonly esPropietario = computed(
    () => this.usuario()?.rol_id === CONTENEDOR_ROL.propietario,
  );

  /** Iniciales para el avatar; el backend no expone la foto de otros usuarios. */
  protected readonly initials = computed(() => {
    const usuario = this.usuario();
    return usuario ? getInitials(usuario.usuario_nombre_corto || usuario.usuario_email) : '';
  });

  constructor() {
    // Reacciona al `id` de la URL y a que el contenedor termine de resolverse.
    effect(() => {
      const membershipId = Number(this.id());
      if (Number.isNaN(membershipId) || this.service.clienteId() == null) return;
      this.load(membershipId);
    });
  }

  protected onBack(): void {
    const slug = this.tenant.currentSlug();
    if (!slug) return;
    void this.router.navigate(['/t', slug, ...SEGURIDAD_USUARIOS_PATH]);
  }

  protected openRolDialog(): void {
    this.rolDialogVisible.set(true);
  }

  protected onRolSaved(): void {
    this.load(Number(this.id()));
  }

  protected confirmRemove(): void {
    const usuario = this.usuario();
    if (!usuario) return;
    const dict = this.t().seguridad.usuarios;
    this.confirmation.confirm({
      header: dict.confirms.deleteHeader,
      message: dict.confirms.deleteOne.replace(
        '{usuario}',
        usuario.usuario_nombre_corto || usuario.usuario_email,
      ),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.t().common.actions.delete,
      rejectLabel: this.t().common.actions.cancel,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.executeRemove(usuario.id),
    });
  }

  private executeRemove(membershipId: number): void {
    const toasts = this.t().seguridad.usuarios.toasts;
    this.service
      .remove([membershipId])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.toast.success(toasts.deleteSuccess.title, toasts.deleteSuccess.desc);
          this.onBack();
        },
        error: () => this.toast.error(toasts.deleteError.title, toasts.deleteError.desc),
      });
  }

  private load(membershipId: number): void {
    this.isLoading.set(true);
    this.notFound.set(false);
    const roles = this.t().seguridad.usuarios.roles;
    this.service
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: (members) => {
          const member = members.find((m) => m.id === membershipId);
          this.usuario.set(member ? toUsuarioRow(member, roles) : null);
          this.notFound.set(!member);
        },
        error: () => {
          this.usuario.set(null);
          this.notFound.set(true);
          const toasts = this.t().seguridad.usuarios.toasts.loadError;
          this.toast.error(toasts.title, toasts.desc);
        },
      });
  }
}
