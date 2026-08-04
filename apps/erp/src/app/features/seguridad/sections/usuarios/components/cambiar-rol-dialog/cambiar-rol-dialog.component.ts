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
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { I18nService, ToastService, extractErrorMessage } from '@reddoc/core';
import { CONTENEDOR_ROL } from '@erp/core/permissions';
import type { AppDict } from '@erp/i18n';
import { ROLES_ASIGNABLES, ROL_LABEL_KEY_BY_ID } from '../../usuarios.constants';
import type { UsuarioRow } from '../../usuarios.model';
import { SeguridadUsuariosService } from '../../usuarios.service';

/**
 * Cambia el rol de un miembro dentro del contenedor.
 *
 * Es todo lo que "gestionar permisos" significa hoy: el acceso se decide por
 * rol (`PermissionsService.isContenedorAdmin`), no por permisos granulares. El
 * día que el backend exponga permisos por módulo, este diálogo crece o le nace
 * un hermano sin tocar el listado.
 *
 * El propietario no aparece entre los asignables: transferir la propiedad es
 * otra operación y el backend todavía no la expone.
 */
@Component({
  selector: 'app-cambiar-rol-dialog',
  standalone: true,
  imports: [FormsModule, DialogModule, ButtonModule, SelectModule],
  templateUrl: './cambiar-rol-dialog.component.html',
})
export class CambiarRolDialogComponent {
  private readonly service = inject(SeguridadUsuariosService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject<I18nService<AppDict>>(I18nService);

  protected readonly t = this.i18n.t;

  readonly visible = input<boolean>(false);
  readonly visibleChange = output<boolean>();
  /** Miembro a editar; `null` cierra cualquier intento de guardar. */
  readonly usuario = input<UsuarioRow | null>(null);
  /** El rol cambió; el host recarga el listado. */
  readonly saved = output<void>();

  protected readonly isSaving = signal(false);
  protected readonly rolId = signal<number>(CONTENEDOR_ROL.usuario);

  protected readonly rolOptions = computed(() =>
    ROLES_ASIGNABLES.map((id) => ({
      value: id,
      label: this.t().seguridad.usuarios.roles[ROL_LABEL_KEY_BY_ID[id] ?? 'usuario'],
    })),
  );

  /** ¿El miembro es el propietario? Su rol no se toca desde acá. */
  protected readonly esPropietario = computed(
    () => this.usuario()?.rol_id === CONTENEDOR_ROL.propietario,
  );

  protected readonly puedeGuardar = computed(
    () => !this.esPropietario() && this.rolId() !== this.usuario()?.rol_id,
  );

  constructor() {
    // Al abrir, siembra el rol actual del miembro (o "usuario" si no tiene).
    effect(() => {
      if (this.visible()) {
        this.rolId.set(this.usuario()?.rol_id ?? CONTENEDOR_ROL.usuario);
        this.isSaving.set(false);
      }
    });
  }

  protected onCancel(): void {
    this.visibleChange.emit(false);
  }

  protected onSubmit(): void {
    const usuario = this.usuario();
    if (!usuario || !this.puedeGuardar() || this.isSaving()) return;

    this.isSaving.set(true);
    const toasts = this.t().seguridad.usuarios.toasts;
    this.service
      .updateRol(usuario.id, this.rolId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toast.success(toasts.rolSuccess.title, toasts.rolSuccess.desc);
          this.saved.emit();
          this.visibleChange.emit(false);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.toast.error(toasts.rolError.title, extractErrorMessage(err, toasts.rolError.desc));
        },
      });
  }
}
